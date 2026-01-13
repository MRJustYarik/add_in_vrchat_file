const { VRChat, Enums } = require('vrchat-api-library');
const { stdin, stdout } = require('process');
const { user, tfn } = require('./config.json');
const readline = require('readline');
const fs = require('fs');
const fetch = require('node-fetch');

const vrChat = new VRChat();

// Просто функция записи в конфиг
async function writeConfig(tag, value) {
    const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

    const keys = tag.split('.');
    let currented = config;

    for (let i = 0; i < keys.length - 1; i++) {
        if (!currented[keys[i]]) {
            currented[keys[i]] = {};
        }
        currented = currented[keys[i]];
    }

    currented[keys[keys.length - 1]] = value;
    fs.writeFileSync('config.json', JSON.stringify(config, null, 2));

    if (tag === "user.cookie") {
        user.cookie = value;
    }
}

// Запоминание куки после входа, локально
async function updateCooke(url) {
    if (url !== user.cookie) {
        writeConfig("user.cookie", url);
    }
}

// Взять инфо о группе
async function showGroupInfo(group_id) {
    let group;
    try {
        group = await vrChat.GroupsApi.GetGroupById({
            groupId: group_id,
        })
    } catch (error) {
        console.error("Ошибка при получении группы:", error);
    }

    return group;
}

// Вывод списка друзей
async function getListFrends(status) {
    try {
        const response = await vrChat.FriendsApi.ListFriends({
            n: 100,
            offline: status
        });
        const firends = response.map(firend => firend.displayName);
        if (firends.length == 0) { return "[-]" }
        return firends;
    }
    catch (error) {
        console.error("ошибка при получении списка друзей", error)
    }
}

// Создание файла в api, в разработке ---------------------------------------
// Мне неиронка предлалала решения, но во первый я их не понимаю, а во вторых 
// не могу проверитьт, по этому я не стал решение неиронки добавлять сюда.

// По итогу я просто не понимаю куда эту ссылку вставить чтобы он ее загрузил.
// Типа обьек создается, а куда ссылку кидать я не знаю, тут скорее проблема в 
// том что я не знаю как работает работа с загрузкой данных
async function CreateFile(url, name, type, extension) {
    try {
        // --- Не используется ---------------------------------------------- 
        const response = await fetch(url);
        const buffer_file = await response.arrayBuffer();
        console.log("Файл скачан, размер:", buffer_file.byteLength, "bytes");
        // ------------------------------------------------------------------

        // Создаем обьект 'файла'
        const obj_file = await vrChat.FilesApi.CreateFile({
            name: name,
            mimeType: type,
            extension: extension
        })

        // Я так понял заливаем 'файл' на API
        // Но обьект пустой по сути, в нем даже ссылки нет
        const file = await vrChat.FilesApi.CreateFileVersion({
            fileId: obj_file.id,
            signatureMd5: "-",
            signatureSizeInBytes: buffer_file.byteLength,
            fileMd5: "-",
            fileSizeInBytes: "-"
        })
        return file;
    } catch (error) {
        console.error("Ошибка:", error);
    }
}
async function addImage(image_url) {
    const vr_file = await CreateFile(image_url, "test", "image/webp", ".webp")

    let work;
    try {
        console.log("groupId:", tfn.id);
        console.log("groupGalleryId:", tfn.gallery.photo.id);
        console.log("fileId:", vr_file.id);
        work = await vrChat.GroupsApi.AddGroupGalleryImage({
            groupId: tfn.id,
            groupGalleryId: tfn.gallery.photo.id,
            fileId: vr_file.id
        })
    } catch (error) {
        console.log("ошибка загрузки в галерею", error)
    }
}
// ---------------------------------------------------------------------------------------

// Любой ввод на основе promise будет работать при условии, что он возвращает код двухфакторной аутентификации.
function Prompt(query) {
    const question = readline.createInterface({
        input: stdin,
        output: stdout,
    });

    return new Promise(resolve => question.question(query, res => {
        question.close();
        resolve(res);
    }))
}
const twoFactor = async (type) => {
    // Двухфакторная аутентификация
    return await Prompt(`Пожалуйста введите ${type} код:\n`);
}

// MAIN функционал
const asyncMethod = async () => {
    // Данные для входа
    const auth = await vrChat.Authenticate({
        username: user.name,
        password: user.pass,
        authCookie: user.cookie,
        twoFactorAuth: "",
    }, twoFactor);
    // Сохраняем Куки, локально
    updateCooke(auth.authCookie);
    //console.log("---- Полная аунтификация -------\n", auth)
    vrChat.EventsApi.Connect()

    // ---- Вот это все я точно не знаю зачем, но я это не трогал ----------
    vrChat.EventsApi.on("undocumented event", (data) => {
        console.log("Undocumented Event");
        console.log(data);
    });

    vrChat.EventsApi.on(Enums.EventType.error, (err) => {
        console.log("Error: " + err.message);
    });

    vrChat.EventsApi.on(Enums.EventType.userOnline, (data) => {
        console.log("User online");
        console.log(data);
    });

    vrChat.EventsApi.on(Enums.EventType.userOffline, (data) => {
        console.log("User offline");
        console.log(data);
    })
    // ---- Вызов функций работы с API ------------------------------------

    const frends_offline = await getListFrends(true);
    const frends_online = await getListFrends(false);
    const group = await showGroupInfo(tfn.id);
    console.log("---- Друзья оффлайн ------------\n", frends_offline)
    console.log("---- Друзья онлайн -------------\n", frends_online)
    console.log("---- Группа TFN ----------------\n", group)


    // Изображение из дс, можно свое вставить если изображения нет
    // В разработке...
    const image_url = "https://media.discordapp.net/attachments/1439632941847154840/1442642428090650726/Owl.PNG?ex=6966c675&is=696574f5&hm=939c279dee6fbd72c4c3d0039dcd9382400de650ceba45074affbd6aeb138b75&=&format=webp&quality=lossless";
    //addImage(image_url)

    // --------------------------------------------------------------------

    // При необходимости отсоединить от API
    //vrChat.EventsApi.Disconnect();
}
asyncMethod();
