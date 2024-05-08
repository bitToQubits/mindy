import path from 'path'
import { app, ipcMain, clipboard,nativeImage } from 'electron'
import serve from 'electron-serve'
import { createWindow } from './helpers'
import { chromium } from 'playwright-extra';
// import { chromium } from 'playwright';
import os from 'node:os';
import axios from 'axios';
import OpenAI from "openai";
import fs from 'fs';
import { v4 as uuidv4 } from "uuid";
import { Groq } from "groq-sdk";
import { userAgent } from 'next/server';

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

ipcMain.on('search_in_internet', async (event, argumentos) => {

  let busqueda_internet = argumentos.query;
  console.log("Busqueda en internet: ",argumentos);

  axios.post('https://api.tavily.com/search/', {
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
    let respuesta = {
      "status": true,
      "content": [
        response.data['answer'],
        response.data['response_time']
      ]
    }
    event.reply('search_in_internet', respuesta);
  })
  .catch(function (error) {
    let respuesta = {
      "status": false,
      "content": "Hubo un error al intentar buscar en internet " + error
    }
    event.reply('search_in_internet', respuesta);
  });

})


//PENDIENTEEEE
ipcMain.on('analyze_image', async (event, argumentos) => {

    console.log("analyze_image", argumentos);

    let nombre_archivo = argumentos.image;
    let instruccion = argumentos.question;

    var dirPath = path.join(os.homedir(), 'Downloads');
    
    // Read the directory contents
    var filesInDir = fs.readdirSync(dirPath);
    console.log(filesInDir)
    
    var files = filesInDir.filter((fileName) => fileName.replaceAll("_","").replaceAll("-","").toLowerCase().includes(nombre_archivo.toLowerCase().replaceAll("_","").replaceAll("-","")) && (fileName.endsWith('.png') || fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || fileName.endsWith('.webp')));
    
    if(files.length == 0){
      dirPath = path.join(os.homedir(), 'OneDrive/Imágenes');
      console.log(dirPath);
    
      // Read the directory contents
      filesInDir = fs.readdirSync(dirPath);
    
      files = filesInDir.filter((fileName) => fileName.replaceAll("_","").replaceAll("-","").toLowerCase().includes(nombre_archivo.toLowerCase().replaceAll("_","").replaceAll("-","")) && (fileName.endsWith('.png') || fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || fileName.endsWith('.webp')));
    
    }
    
    if(files.length == 0){
      let respuesta = {
        "status": false,
        "content": "Imagen no encontrada."
      };
      event.reply('analyze_image', respuesta);
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
    });

    var respuesta;
    
    if(typeof response.choices[0].message.content != "undefined"){
      respuesta = {
        "status": true,
        "content": [
          response.choices[0].message.content,
          dirPath+'\\'+files[0]
        ]
      }
    }else{
      respuesta = {
        "status": false,
        "content": "No se pudo analizar la imagen"
      }
    }

    event.reply('analyze_image', respuesta);

});

ipcMain.on('create_note', async (event, argumentos) => {

  var termino = argumentos.term;
  var debe_buscar_imagenes = (argumentos.search_for_images) ? argumentos.search_for_images : true;

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

  const stealth = require('puppeteer-extra-plugin-stealth')()

  // Add the plugin to playwright (any number of plugins can be added)
  await chromium.use(stealth)

  const browser = await chromium.launchPersistentContext(
    userDataDir, 
    {
      headless: false, // Adjust as needed
      //Stay undetected by google
      args: ['--profile-directory='+profileDirectory, '--start-maximized', '--disable-blink-features=AutomationControlled',"--disable-notifications",
      "--disable-gpu",
      "--disable-setuid-sandbox",
      "--deterministic-fetch",
      "--disable-features=IsolateOrigins,site-per-process",
      "--disable-site-isolation-trials",
      "--disable-web-security",
      '--disable-component-extensions-with-background-pages' ]
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

  let respuesta = {
    "status": false,
    "content": "Error while trying to create note"
  }

  if(output.length > 0){
    await crear_nota(termino, output, img).then(() => {
      respuesta = {
        "status": true,
        "content": "Note created successfully"
      }
   }).catch((e) => {
      respuesta.content += ": " + e;
    });
  }
  
  browser.close();
  event.reply('create_note', respuesta);
})

ipcMain.on('create_event_google_calendar', async (event, argumentos) => {

    const title = argumentos.title;
    const description = argumentos.description;
    const startTime = argumentos.startTime;
    const endTime = argumentos.endTime;
    
    const userDataDir = 'C:\\Users\\'+os.userInfo().username+'\\AppData\\Local\\Google\\Chrome\\User Data';
    const profileDirectory = 'Default';

    async function createEvent(title: string, description: string, startTime: string, endTime: string) {

      const stealth = require('puppeteer-extra-plugin-stealth')()

      // Add the plugin to playwright (any number of plugins can be added)
      await chromium.use(stealth)
  
      const browser = await chromium.launchPersistentContext(
        userDataDir, 
        {
          headless: false, // Adjust as needed
          //'--disable-features=IsolateOrigins', '--disable-features=site-per-process', '--disable-features=CrossSiteDocumentBlockingIfIsolating', '--disable-features=CrossSiteDocumentBlockingAlways'
          args: [`--profile-directory=${profileDirectory}`, '--start-maximized', '--disable-blink-features=AutomationControlled',"--disable-notifications",
          "--disable-gpu",
          "--disable-setuid-sandbox",
          "--deterministic-fetch",
          "--disable-features=IsolateOrigins,site-per-process",
          "--disable-site-isolation-trials",
          "--disable-web-security",
          '--disable-component-extensions-with-background-pages']
        }
      );
    
      const page = await browser.newPage();
    
      await page.goto('https://calendar.google.com');

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

      browser.close();

    }

    let respuesta = {
      "status": false,
      "content": "Error while trying to create event"
    }

    createEvent(title, description, startTime, endTime).then(() => {

      respuesta = {
        "status": true,
        "content": "Event created succesfully: "+title
      }
      
      event.reply('create_event_google_calendar', respuesta);

    }).catch((e) => {
      respuesta.content += ": " + e;
      event.reply('create_event_google_calendar', respuesta);
    });
});

ipcMain.on('create_task_google_calendar', async (event, argumentos) => {

  const title = argumentos.title;
  const description = (argumentos.description) ? argumentos.description : "";
  const dueDate = argumentos.dueDate;

  const userDataDir = 'C:\\Users\\'+os.userInfo().username+'\\AppData\\Local\\Google\\Chrome\\User Data';
  console.log("os.userInfo().username", os.userInfo().username);
  const profileDirectory = 'Default';

  async function createTask(title: string, description: string, dueDate: string){

    const stealth = require('puppeteer-extra-plugin-stealth')()

    // Add the plugin to playwright (any number of plugins can be added)
    await chromium.use(stealth)

    const browser = await chromium.launchPersistentContext(
      userDataDir, 
      {
        headless: false, // Adjust as needed
        args: [`--profile-directory=${profileDirectory}`, '--start-maximized', '--disable-blink-features=AutomationControlled',"--disable-notifications",
        "--disable-gpu",
        "--disable-setuid-sandbox",
        "--deterministic-fetch",
        "--disable-features=IsolateOrigins,site-per-process",
        "--disable-site-isolation-trials",
        "--disable-web-security",
        '--disable-component-extensions-with-background-pages'],
      },
    );
    
    //add init script
    await browser.addInitScript("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
  
    const page = await browser.newPage();

    await page.waitForTimeout(4000);
  
    await page.goto('https://calendar.google.com');

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
    await fecha_cierre.nth(22).click();

    await page.waitForTimeout(2000);

    fecha_cierre = await page.locator('[isfullscreen="false"] input[type="text"]');
    await fecha_cierre.nth(7).fill(dueDate);

    await page.waitForTimeout(2000);

    const description_note = await page.locator("[isfullscreen='false'] textarea");
    description_note.fill(description);

    await page.waitForTimeout(2000);
    
    const save_button = await page.locator('[isfullscreen="false"] button');
    save_button.nth(35).click();

    await page.waitForTimeout(3000);
    browser.close();
  }

  createTask(title, description,dueDate).then(() => {
    let respuesta = {
      "status": true,
      "content": "Task created succesfully: "+title
    }
    event.reply('create_task_google_calendar', respuesta);
  }).catch((e) => {
    let respuesta = {
      "status": false,
      "content": "Error while trying to create task: "+e
    }
    event.reply('create_task_google_calendar', respuesta);
 })
 
});

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


ipcMain.on('generate_image', async (event, argumentos) => {

  console.log("Generate_images", argumentos);

  let prompt = argumentos.prompt;
  let number = (argumentos.number) ? argumentos.number : 1;
  

  const openai = new OpenAI({apiKey:"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"});
  const image = await openai.images.generate({ model: (number == 1) ? "dall-e-3" : "dall-e-2", n: number , prompt });

  const images = [];

  let respuesta = {
    "status": false,
    "content": [
      "Error while trying to generate image(s)",
      []
    ]
  }

  if(typeof image.data.length !== "undefined" && image.data.length > 0){
    for(let i = 0; i < image.data.length; i++){
      images.push(image.data[i].url);
    }
    respuesta = {
      "status": true,
      "content": [
        "Image(s) generated succesfully",
        images
      ]
    }
  }

  event.reply('generate_image', respuesta);
})

ipcMain.on('generacion_documentos', async (event, argumentos) => {

  var tema = argumentos.subject;

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
  args = '-f markdown -t pdf -o '+output_path+' --toc=true';

  let respuesta = {
    "status": true,
    "content": "Document created succesfully"
  }
  
  // Set your callback function
  callback = function (err) {
  
    respuesta = {
      "status": false,
      "content": "Error while trying to generate document: " + err
    }
    
  };
  
  // Call pandoc
  nodePandoc(texto_completo, args, callback);
  event.reply('generacion_documentos', respuesta);
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