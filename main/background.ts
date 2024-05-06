import path from 'path'
import { app, ipcMain, clipboard,nativeImage } from 'electron'
import serve from 'electron-serve'
import { createWindow } from './helpers'
import { chromium, Page } from 'playwright';
import os from 'node:os';
import axios from 'axios';
import OpenAI from "openai";
import fs from 'fs';
import { ElevenLabsClient, play  } from "elevenlabs";
import { v4 as uuidv4 } from "uuid";
import { Groq } from "groq-sdk";

var markdownpdf = require("markdown-pdf");

const isProd = process.env.NODE_ENV === 'production'

if (isProd) {
  serve({ directory: 'app' })
} else {
  app.setPath('userData', `${app.getPath('userData')} (development)`)
}

;(async () => {
  await app.whenReady()

  const mainWindow = createWindow('main', {
    width: 1323,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  })

  if (isProd) {
    await mainWindow.loadURL('app://./home');
  } else {
    const port = process.argv[2];
    await mainWindow.loadURL(`http://localhost:${port}/home`);
    mainWindow.webContents.openDevTools()
  }
})()

app.on('window-all-closed', () => {
  app.quit()
})

const automate_6 = async function (text: string){
  const elevenlabs = new ElevenLabsClient({
    apiKey: "219171ffe1d5a59c4de9d4701090af89" // Defaults to process.env.ELEVENLABS_API_KEY
  }) 
  
  const audio = await elevenlabs.generate({
      voice: "mWsaugnzxPXnXHgFS0Iv",
      text: "Hello, i am omar, the selected voice for mindy today. How can i assist you?",
      voice_settings: {
        "stability": 0.45,
        "similarity_boost": 1
      }
  }).then(function (response) {
    return response;
    }).catch(function (error) {
    return error;
  });;

  await play(audio).then(function (response) {
    return response;
    }).catch(function (error) {
    return error;
  });
} 

const automate_5 = async function (busqueda_internet: string){

  var response = axios.post('https://api.tavily.com/search/', {
    "api_key": "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",
    "query": busqueda_internet,
    "search_depth": "deep",
    "include_answer": true,
    "include_images": false,
    "include_raw_content": false,
    "max_results": 5,
    "include_domains": [],
    "exclude_domains": []
  })
  .then(function (response) {
    return [response.data['answer'], response.data['response_time']];
  })
  .catch(function (error) {
    return error;
  });

  return response;

}

const automate_4 = async function (instruccion: string, nombre_archivo: string){
  //Buscar en la carpeta de descargas una imagen con un nombre similar al que se le pasa
  //Si la encuentra, la envia a la api de openai para que genere una descripcion de la imagen
  //Si no la encuentra, busca en la carpeta de imagenes de windows

  var dirPath = 'C:\\Users\\'+os.userInfo().username+'\\Downloads';

  // Read the directory contents
  var filesInDir = fs.readdirSync(dirPath);

  var files = filesInDir.filter((fileName) => fileName.includes(nombre_archivo) && (fileName.endsWith('.png') || fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || fileName.endsWith('.webp')));

  if(files.length == 0){
    dirPath = 'C:\\Users\\'+os.userInfo().username+'\\Pictures';

    // Read the directory contents
    filesInDir = fs.readdirSync(dirPath);

    files = filesInDir.filter((fileName) => fileName.replaceAll("_","").replaceAll("-","").includes(nombre_archivo.replaceAll("_","").replaceAll("-","")) && (fileName.endsWith('.png') || fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || fileName.endsWith('.webp')));

  }

  if(files.length == 0){
    return;
  }

  //read the file
  const file_buffer  = fs.readFileSync(dirPath+'\\'+files[0]);
  const contents_in_base64 = file_buffer.toString('base64');

  const openai_client = new OpenAI({apiKey:"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"});

  const response = await openai_client.chat.completions.create({
    model: "gpt-4-turbo",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: instruccion },
          {
            type: "image_url",
            image_url: {
              "url": "data:image/jpeg;base64," + contents_in_base64,
              "detail": "low"
            },
          },
        ],
      },
    ],
    stream: true
  });

  for await (const chunk of response) {
    if(typeof chunk.choices[0].delta.content != "undefined"){
      console.log(chunk.choices[0].delta.content);
    }
  }

}



const automate_2 = async function (termino: string, debe_buscar_imagenes: boolean){
  const userDataDir = 'C:\\Users\\'+os.userInfo().username+'\\AppData\\Local\\Google\\Chrome\\User Data';
  const profileDirectory = 'Default';

  async function buscar_imagenes(termino){
    var url_busqueda = `https://www.google.com/search?q=${termino}&tbm=isch`
    await page.goto(url_busqueda)

    var imgs = page.locator("h3 g-img img");

    await imgs.nth(1).click()
    var img_url_element = await page.locator('.iPVvYb');
    var img_url = await img_url_element.getAttribute("src");

    return img_url;
  }

  async function crear_nota(titulo: string, output: string, img: string){
    await page.goto("https://keep.google.com/")

    const textarea = await page.locator("[role='textbox']")

    await textarea.nth(1).click();

    await page.waitForTimeout(2000);

    await textarea.nth(0).pressSequentially(titulo);

    await page.waitForTimeout(2000);

    await textarea.nth(1).fill(output);

    await page.waitForTimeout(2000);

    if(img){
      await pegar_imagen();
    }

    async function pegar_imagen(){
      var piezas_url_imagen = await img.split(".")

      if(piezas_url_imagen[piezas_url_imagen.length-1] == "svg"){
        return;
      }

      var imagen = await axios.get(img, {responseType: 'arraybuffer'}).then(function (response) {
        return response;
      })
      .catch(function (error) {
        return error;
      })

      var imagen_nativa = nativeImage.createFromBuffer(imagen.data);
      clipboard.writeImage(imagen_nativa)

      await textarea.nth(1).click();
      await page.keyboard.press('Control+V');

      await page.mouse.wheel(0, -10000000000);

      await page.waitForTimeout(4000);
    }

    await page.mouse.wheel(0, -10000000000);

    await page.waitForTimeout(3000);

    await page.locator("[style='user-select: none;']").nth(25).click();

    await page.waitForTimeout(3000);
  }

  const browser = await chromium.launchPersistentContext(
    userDataDir, 
    {
      headless: false, // Adjust as needed
      args: [`--profile-directory=${profileDirectory}`]
    }
  );

  const page = await browser.newPage();

  await page.goto('https://en.wikipedia.org/');

  await page.locator('[type="search"]').fill(termino);

  await page.waitForTimeout(2000);

  await page.locator('.cdx-search-input__end-button').click();

  if(await page.isVisible(".searchResultImage-thumbnail")){
    await page.locator(".searchResultImage-thumbnail").click();
    await page.waitForTimeout(2000);
  }else if (await page.getByText(termino+' may refer to:').isVisible()){
    var enlaces = await page.locator("#mw-content-text a");

    for(var i = 0; i < await enlaces.count(); i++){
      if((await enlaces.nth(i).getAttribute('href')).startsWith("/wiki/")){
        await enlaces.nth(i).click();
        break;
      }
    }

    await page.waitForTimeout(2000);
  }


  var contenidos_elementos = await page.locator("#mw-content-text meta, p");

  var output = "";

  for(var i = 0; i < (await contenidos_elementos.count()); i++){
    if(await contenidos_elementos.nth(i).getAttribute("class") == "mw-search-nonefound"){
      await page.waitForTimeout(4000);
      return;
    }
    if(await contenidos_elementos.nth(i).evaluate(node => node.tagName) == "P"
      && (await contenidos_elementos.nth(i).evaluate(node => node.innerText)).trim() != ""){
        output+=(await contenidos_elementos.nth(i).evaluate(node => node.innerText)) + "\n";
      }
    if(await contenidos_elementos.nth(i).evaluate(node => node.tagName) == "META"){
      break;
    }
  }

  termino = await page.locator('.mw-page-title-main').nth(0).textContent();

  var img = "";

  if(debe_buscar_imagenes){
    img = await buscar_imagenes(termino).then((imagen_url) => {
      return imagen_url
   }).catch((e) => {
      return ""
   });
  }

  if(output.length > 0){
    await crear_nota(termino, output, img).then(() => {
   }).catch((e) => {
   });
  }

  browser.close();
}

const automate = async function (){
  const userDataDir = 'C:\\Users\\'+os.userInfo().username+'\\AppData\\Local\\Google\\Chrome\\User Data';
  const profileDirectory = 'Default';

  const browser = await chromium.launchPersistentContext(
    userDataDir, 
    {
      headless: false, // Adjust as needed
      args: [`--profile-directory=${profileDirectory}`]
    }
  );

  const page = await browser.newPage();

  await page.goto('https://calendar.google.com');

  async function createEvent(title: string, description: string, startTime: string, endTime: string) {
    const createButton = await page.waitForSelector('[data-is-column-view-context="true"]');
    await createButton.click();
    await page.waitForTimeout(2000);

    const titleInput = await page.locator("[isfullscreen='false'] input[type='text']").first();
    await titleInput.fill(title);

    await page.waitForTimeout(2000);

    var descriptionInput = await page.locator("[isfullscreen='false'] [data-key='description']");
    await descriptionInput.click();
    descriptionInput = await page.locator("[isfullscreen='false'] [contenteditable='true']");
    await descriptionInput.fill(description);

    await page.waitForTimeout(2000);

    var startDateInput = await page.locator("[isfullscreen='false'] [data-key='startDate']").nth(0);
    await startDateInput.click();
    startDateInput = await page.locator("[isfullscreen='false'] input[type='text']");
    await startDateInput.nth(1).fill(startTime);

    await page.waitForTimeout(2000);

    const end_input = await page.locator("[isfullscreen='false'] input[type='text']");
    await end_input.nth(4).fill(endTime);

    await page.waitForTimeout(2000);

    const saveButton = await page.locator('[isfullscreen="false"] button').nth(28);
    await saveButton.click();
    await page.waitForTimeout(3000);
  }

  async function createTask(title: string, description: string, dueDate: string){
    const createButton = await page.locator('[data-is-column-view-context="true"]');
    await createButton.click();

    await page.waitForTimeout(2000);

    const elegir_boton_task = await page.locator("[isfullscreen='false'] [id='tabTask']");
    await elegir_boton_task.click();

    await page.waitForTimeout(2000);

    const title_input = await page.locator("[isfullscreen='false'] input[type='text']")
    await title_input.nth(0).fill(title);

    await page.waitForTimeout(2000);

    var fecha_cierre = await page.locator('[isfullscreen="false"] button')
    await fecha_cierre.nth(21).click();

    await page.waitForTimeout(2000);

    fecha_cierre = await page.locator('[isfullscreen="false"] input[type="text"]');
    await fecha_cierre.nth(7).fill(dueDate);

    await page.waitForTimeout(2000);

    const description_note = await page.locator("[isfullscreen='false'] textarea");
    description_note.fill(description);

    await page.waitForTimeout(2000);
    
    const save_button = await page.locator('[isfullscreen="false"] button');
    save_button.nth(28).click();

    await page.waitForTimeout(3000);
  }

  createEvent("Elison Perez", "Miren", "2024-02-26 10:00 PM", "2024-02-26 11:00 PM").then(() => {
 }).catch((e) => {
 })
  browser.close();
}

ipcMain.on('message', async (event, arg) => {

  let prompt = `
      Realiza un documento que hable sobre el siguiente tema, desde la perspectiva de una banca de loteria
      que es una microempresa, llamada "Lotenal".

      ⦁	Investigación Inicial:
        ⦁	Realizar una investigación sobre las necesidades específicas de esa microempresa en términos de presencia en línea.
        ⦁	Identificar las características clave que el sitio web debe incluir (por ejemplo, catálogo de productos, horarios de atención, formularios de contacto).

  `
 
  automate_3(prompt, "escuela").then(() => {
    
 }).catch((e) => {
    console.log('258 handle error here: ', e.message)
 })
   
  event.reply('message', `Accion completada`);
}) 

ipcMain.on('download_request', async (event, args) => {
  console.log("download request!")
  const imageName = uuidv4();
  const downloadPath = 'renderer/public/images/classifiers/'+imageName+'.png'; // Replace with your desired download path

  try {
    const response = await axios({
      method: 'GET',
      url: args,
      responseType: 'stream',
    });

    // Create a write stream to save the image
    const writer = fs.createWriteStream(downloadPath);

    // Pipe the response data into the writer stream
    response.data.pipe(writer);

    // Wait for the image to finish downloading
    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    console.log('Image downloaded successfully!');
    event.reply('download_request', imageName);
  } catch (error) {
    console.error('Error downloading image:', error.message);
    event.reply('download_request', 0);
  }

})


ipcMain.on('generacion_imagenes', async (event, prompt) => {

  const openai = new OpenAI({apiKey:"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"});
  const image = await openai.images.generate({ model: "dall-e-2", n: 2 , prompt });

  const images = [];

  for(let i = 0; i < image.data.length; i++){
    images.push(image.data[i].url);
  }

  event.reply('generacion_imagenes', images);
})

ipcMain.on('generacion_documentos', async (event, tema) => {

  var texto_completo = "";
  async function generar_contenido(subtema: string){
      var response;
      response = await groq.chat.completions.create({
        messages: [
          { role: 'system', content: "Use markdown to format your answer. Dont put any conclusion section in your answer, unless the subtopic includes it. You will explain the user topic in detail."},
          { role: 'user', content: subtema + ", " + tema },
        ],
        model: 'llama3-70b-8192',
      });
      response = response.choices[0].message.content;
      texto_completo += response;
  }

  const openai_client = new OpenAI({apiKey:"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"});

  let respuesta_division_tematica_openai = await openai_client.chat.completions.create({
    messages: [{"role": "system", "content": "Your task will be to divide a topic by thematic points. Output a list separated by comas, only the topic, subtopics and the comas. The topic will be preceed by -- to distinct itself from the subtopics."},
    {"role": "user", "content": tema}],
    model: "gpt-4-turbo",
  });

  var division_temas = respuesta_division_tematica_openai.choices[0].message.content.split(",");

  for(var i = 0; i < division_temas.length; i++){
    if(division_temas[i].trim().startsWith("--")){
      tema = division_temas[i].replace("--", "");
      division_temas.splice(i,1);
      break;
    }
  }

  texto_completo+="# "+tema+"\n\n";

  const groq = new Groq({apiKey:"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"});
  
  for await (let subtema of division_temas){
    await generar_contenido(subtema).then(function () {
      console.log(texto_completo);
    })
    .catch(function (error) {
      console.log("Error generando documento: ", error);
    });
    texto_completo+="\n\n";
  }

  const output_path = "./renderer/public/documents/"+tema+".pdf";

  // markdownpdf().from.string(texto_completo).to(output_path, function () {
  //   event.reply('generacion_documentos', tema);
  // })
  
  var nodePandoc = require('node-pandoc');

  var args, callback;
  
  // Arguments can be either a single string:
  args = '-f markdown -t pdf -o ./tema.pdf --toc=true';
  
  // Set your callback function
  callback = function (err, result) {
  
    if (err) {
      console.error('Oh Nos: ',err);
    }
  
    // For output to files, the 'result' will be a boolean 'true'.
    // Otherwise, the converted value will be returned.
    console.log(result);
    return result;
  };
  
  // Call pandoc
  nodePandoc(texto_completo, args, callback);
  event.reply('generacion_documentos', tema);
})

ipcMain.on('eliminar_todas_imagenes_clasificacion', async (event) => {
  const directory = 'renderer/public/images/classifiers';

  fs.readdir(directory, (err, files) => {
    if (err) throw err;

    for (const file of files) {
      fs.unlink(path.join(directory, file), err => {
        if (err){
          event.reply('eliminar_todas_imagenes_clasificacion', "Error while trying to remove images" + err);
        }
      });
    }
  }
  );

  event.reply('eliminar_todas_imagenes_clasificacion', "All data classifications removed");
});