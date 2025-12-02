const { VRChat, Enums } = require('vrchat-api-library');
const { stdin, stdout } = require('process');
const { user, tfn } = require('./config.json');
const readline = require('readline');
const fs = require('fs');
const fetch = require('node-fetch');

const vrChat = new VRChat();

async function writeConfig(tag, value) {
    const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
    config[tag] = value;
    fs.writeFileSync('config.json', JSON.stringify(config, null, 2));
}

async function updateCooke(url) {
    if (url !== user.cookie) {
        writeConfig("user.cookie", url);
    }
}

// Взять инфо о группе
async function getGroupInfo(group_id) {
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

// Создание файла в api
async function CreateFile(url, name, type, extension) {
    try {
        // --- БЕСПОЛЕЗНО --------------------------------------------------- 
        const response = await fetch(url);
        const buffer_file = await response.arrayBuffer();
        console.log("Файл скачан, размер:", buffer_file.byteLength, "bytes");
        // ------------------------------------------------------------------

        const obj_file = await vrChat.FilesApi.CreateFile({
            name: name,
            mimeType: type,
            extension: extension
        })

        const file = await vrChat.FilesApi.CreateFileVersion({
            fileId: obj_file.id,
            signatureMd5: "-",
            signatureSizeInBytes: buffer_file.byteLength,
            fileMd5: "-",
            fileSizeInBytes: "-"
        })
        //console.log(file)
        return file;
    } catch (error) {
        console.error("Ошибка:", error);
    }
}

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
    // Сохраняем Куки если нужно
    updateCooke(auth.authCookie);
    //console.log(auth.json.presence);

    // Базовое использование EventsApi с использованием класса VRChat.
    vrChat.EventsApi.Connect()

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

    //const group = await getGroupInfo(tfn.id)

    console.log("--------------------------------");
    const image_url = "https://media.discordapp.net/attachments/1439632941847154840/1442642428090650726/Owl.PNG?ex=692d6d35&is=692c1bb5&hm=6a24e845b129cdab90a88b2d7c9935254bbc6a82a59884a16939f59e3ddfa48d&=&format=webp&quality=lossless";
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


    // -- Optionally disconnect from the API
    //vrChat.EventsApi.Disconnect();
}
asyncMethod();
