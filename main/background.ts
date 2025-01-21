import path from 'path'
import { app, ipcMain, clipboard,nativeImage, protocol } from 'electron'
import serve from 'electron-serve'
import { createWindow } from './helpers'
import { chromium, firefox } from 'playwright-extra';
// import { chromium } from 'playwright';
import os from 'node:os';
import axios from 'axios';
import OpenAI from "openai";
import fs from 'fs';
import { v4 as uuidv4 } from "uuid";
import { Groq } from "groq-sdk";

const isProd = process.env.NODE_ENV === 'production'
 
var mainWindow = null;

if (isProd) {
  serve({ directory: 'app' })
} else {
  app.setPath('userData', `${app.getPath('userData')} (development)`)
}

;(async () => {
  await app.whenReady()

  mainWindow = createWindow('main', {
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
    //mainWindow.webContents.openDevTools()
  } 
})()

app.on('window-all-closed', () => {
  app.quit()
})

ipcMain.on('search_in_internet', async (event, argumentos) => {
  
  let busqueda_internet = argumentos.query;

  search_on_internet(busqueda_internet);

  function search_on_internet(query){
    axios.post('https://api.tavily.com/search/', {
      "api_key": "null",
      "query": "Responde en español: " + query,
      "search_depth": "basic",
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
    .catch(function () {
      // let respuesta = {
      //   "status": false,
      //   "content": "Error mientras se trataba de buscar en internet: " + error
      // }
      // event.reply('search_in_internet', respuesta);
      search_on_internet(query);
    });
  }

})

ipcMain.on('search_and_analyze_image', async (event, argumentos) => {


    let nombre_archivo = argumentos.image;

    console.log("argumentos.image", argumentos.image)

    var dirPath = path.join(os.homedir(), 'Downloads');
    
    // Read the directory contents
    var filesInDir = fs.readdirSync(dirPath);

    console.log("filesInDir", filesInDir)
    
    var files = filesInDir.filter((fileName) => fileName.replaceAll("_","").replaceAll(" ","").replaceAll("-","").toLowerCase().includes(nombre_archivo.replaceAll("_","").replaceAll(" ","").replaceAll("-","").toLowerCase()) && (fileName.endsWith('.png') || fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || fileName.endsWith('.webp')));
    
    if(files.length == 0){
      dirPath = path.join(os.homedir(), 'OneDrive/Imágenes');
    
      // Read the directory contents
      filesInDir = fs.readdirSync(dirPath);
    
      files = filesInDir.filter((fileName) => fileName.replaceAll("_","").replaceAll(" ","").replaceAll("-","").toLowerCase().includes(nombre_archivo.replaceAll(" ","").replaceAll("_","").replaceAll("-","").toLowerCase()) && (fileName.endsWith('.png') || fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || fileName.endsWith('.webp')));
    
    }
    
    if(files.length == 0){
      let respuesta = {
        "status": false,
        "content": "Imagen no encontrada."
      };
      event.reply('search_and_analyze_image', respuesta);
      return;
    }
    
    //read the file
    const file_buffer  = fs.readFileSync(dirPath+'\\'+files[0]);
    const contents_in_base64 = file_buffer.toString('base64');

    let respuesta = {
      "status": true,
      "content": contents_in_base64
    };

    event.reply('search_and_analyze_image', respuesta);

});
  
ipcMain.on('create_note', async (event, argumentos) => {

  var termino = argumentos.term;
  var debe_buscar_imagenes = (argumentos.search_for_images) ? argumentos.search_for_images : true;

  const userDataDir = 'C:\\Users\\'+os.userInfo().username+'\\AppData\\Roaming\\Mozilla\\Firefox\\Profiles\\dhq95odj.default-default';

  async function buscar_imagenes(termino){

    var unplash = axios.get('https://api.unsplash.com/search/photos', {
      params: {
        query: termino,
        per_page: 1,
        page: 1,
      },
      headers: {
        'Authorization': `Client-ID Pshk--FgfWEn_Kjz8iY-pbb72Ux9P94QFA0auXpfbZo`
      }
    })
    .then(function (response) {

      var img_url = response.data.results[0].urls.regular;

      return img_url;

    }).catch(function (error) {
      return "";
    });

    return unplash;
  }

  async function crear_nota(titulo: string, output: string, img: string){
    await page.goto("https://keep.google.com/");

    if(await page.getByText('Usar otra cuenta').isVisible()){

      await page.getByText('Usar otra cuenta').click();
      await page.locator('[type="email"]').fill("testeomindy@gmail.com");
      await page.locator('[type="email"]').press('Enter');

      await page.waitForTimeout(4000);
  
      await page.locator('[type="password"]').fill('claveMindyTest07');
      await page.locator('[type="password"]').press('Enter');

      await page.waitForTimeout(3000);

      if(await page.getByText('Elige el método de acceso:').isVisible()){
        await page.getByText('Confirma el correo de recuperación').click();
        await page.locator('[id="knowledge-preregistered-email-response"]').fill("jlbciriaco@gmail.com");
        await page.locator('[id="knowledge-preregistered-email-response"]').press('Enter');
      }else if (await page.getByText('Choose how you want to sign in:').isVisible()){
        await page.getByText('Confirm your recovery email').click();
        await page.locator('[id="knowledge-preregistered-email-response"]').fill("jlbciriaco@gmail.com");
        await page.locator('[id="knowledge-preregistered-email-response"]').press('Enter');
      }

    }else if(await page.getByText('Sign in').nth(0).isVisible() || await page.getByText('Acceder').nth(0).isVisible()){
      if(await page.getByText('Sign in').nth(0).isVisible()){
        await page.getByText('Sign in').nth(0).click();
      }else if(await page.getByText('Acceder').nth(0).isVisible()){
        await page.getByText('Acceder').nth(0).click();
      }

      await page.waitForTimeout(2000);

      await page.locator('[type="email"]').fill("testeomindy@gmail.com");
      await page.locator('[type="email"]').press('Enter');

      await page.waitForTimeout(4000);
  
      await page.locator('[type="password"]').fill('claveMindyTest07');
      await page.locator('[type="password"]').press('Enter');

      await page.waitForTimeout(3000);

      if(await page.getByText('Elige el método de acceso:').isVisible()){
        await page.getByText('Confirma el correo de recuperación').click();
        await page.locator('[id="knowledge-preregistered-email-response"]').fill("jlbciriaco@gmail.com");
        await page.locator('[id="knowledge-preregistered-email-response"]').press('Enter');
      }else if (await page.getByText('Choose how you want to sign in:').isVisible()){
        await page.getByText('Confirm your recovery email').click();
        await page.locator('[id="knowledge-preregistered-email-response"]').fill("jlbciriaco@gmail.com");
        await page.locator('[id="knowledge-preregistered-email-response"]').press('Enter');
      }
    }

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

    await page
    .getByRole('button')
    .filter({ hasText: 'Cerrar' }).click();

    await page.waitForTimeout(3000);
  }

  const stealth = require('puppeteer-extra-plugin-stealth')()

  await firefox.use(stealth);

  const userAgentStrings = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:88.0) Gecko/20100101 Firefox/88.0",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:87.0) Gecko/20100101 Firefox/87.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:88.0) Gecko/20100101 Firefox/88.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:87.0) Gecko/20100101 Firefox/87.0",
    "Mozilla/5.0 (X11; Linux x86_64; rv:88.0) Gecko/20100101 Firefox/88.0",
    "Mozilla/5.0 (X11; Linux x86_64; rv:87.0) Gecko/20100101 Firefox/87.0"
  ];

  // const browser = await chromium.launchPersistentContext(
  const browser = await firefox.launchPersistentContext(
    userDataDir,
    {
      headless: false, // Adjust as needed
    userAgent: userAgentStrings[Math.floor(Math.random() * userAgentStrings.length)],
    viewport: {width: 1920 - 400, height: 1040 - 320}
    } 
  );

  //add init script
  await browser.addInitScript("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})");

  const page = await browser.newPage();

  await page.goto('https://es.wikipedia.org/');

  await page.locator('[type="search"]').fill(termino);

  await page.waitForTimeout(2000);

  await page.locator('.cdx-search-input__end-button').click();

  if(await page.isVisible(".searchResultImage-thumbnail")){
    await page.locator(".searchResultImage-thumbnail").click();
    await page.waitForTimeout(2000);
  }else if (await page.getByText('Quizás quisiste decir').isVisible()){
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
    "content": "Error al intentar crear una nota"
  }

  if(output.length > 0){
    await crear_nota(termino, output, img).then(() => {
      respuesta = {
        "status": true,
        "content": "Nota creada con éxito"
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
    
    const userDataDir = 'C:\\Users\\'+os.userInfo().username+'\\AppData\\Roaming\\Mozilla\\Firefox\\Profiles\\dhq95odj.default-default';

    async function createEvent(title: string, description: string, startTime: string, endTime: string) {

      const stealth = require('puppeteer-extra-plugin-stealth')()

      // Add the plugin to playwright (any number of plugins can be added)
        // // Add the plugin to playwright (any number of plugins can be added)
        await firefox.use(stealth);
  
        const userAgentStrings = [
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:88.0) Gecko/20100101 Firefox/88.0",
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:87.0) Gecko/20100101 Firefox/87.0",
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:88.0) Gecko/20100101 Firefox/88.0",
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:87.0) Gecko/20100101 Firefox/87.0",
          "Mozilla/5.0 (X11; Linux x86_64; rv:88.0) Gecko/20100101 Firefox/88.0",
          "Mozilla/5.0 (X11; Linux x86_64; rv:87.0) Gecko/20100101 Firefox/87.0"
        ];
    
        // const browser = await chromium.launchPersistentContext(
        const browser = await firefox.launchPersistentContext(
          userDataDir,
          {
            headless: false, // Adjust as needed
          userAgent: userAgentStrings[Math.floor(Math.random() * userAgentStrings.length)],
          viewport: {width: 1920 - 400, height: 1040 - 320}
          }
        );
      
      //add init script
      await browser.addInitScript("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})");
    
      const page = await browser.newPage();
    
      await page.goto('https://calendar.google.com');

      if(await page.getByText('Usar otra cuenta').isVisible()){
        await page.getByText('Usar otra cuenta').click();
        await page.locator('[type="email"]').fill("testeomindy@gmail.com");
        await page.locator('[type="email"]').press('Enter');
  
        await page.waitForTimeout(4000);
    
        await page.locator('[type="password"]').fill('claveMindyTest07');
        await page.locator('[type="password"]').press('Enter');
  
        await page.waitForTimeout(3000);
  
        if(await page.getByText('Elige el método de acceso:').isVisible()){
          await page.getByText('Confirma el correo de recuperación').click();
          await page.locator('[id="knowledge-preregistered-email-response"]').fill("jlbciriaco@gmail.com");
          await page.locator('[id="knowledge-preregistered-email-response"]').press('Enter');
        }else if (await page.getByText('Choose how you want to sign in:').isVisible()){
          await page.getByText('Confirm your recovery email').click();
          await page.locator('[id="knowledge-preregistered-email-response"]').fill("jlbciriaco@gmail.com");
          await page.locator('[id="knowledge-preregistered-email-response"]').press('Enter');
        }
  
      }else if(await page.getByText('Sign in').nth(0).isVisible() || await page.getByText('Acceder').nth(0).isVisible()){
        if(await page.getByText('Sign in').nth(0).isVisible()){
          await page.getByText('Sign in').nth(0).click();
        }else if(await page.getByText('Acceder').nth(0).isVisible()){
          await page.getByText('Acceder').nth(0).click();
        }

      await page.waitForTimeout(2000);
  
        await page.locator('[type="email"]').fill("testeomindy@gmail.com");
        await page.locator('[type="email"]').press('Enter');
  
        await page.waitForTimeout(4000);
    
        await page.locator('[type="password"]').fill('claveMindyTest07');
        await page.locator('[type="password"]').press('Enter');
  
        await page.waitForTimeout(3000);
  
        if(await page.getByText('Elige el método de acceso:').isVisible()){
          await page.getByText('Confirma el correo de recuperación').click();
          await page.locator('[id="knowledge-preregistered-email-response"]').fill("jlbciriaco@gmail.com");
          await page.locator('[id="knowledge-preregistered-email-response"]').press('Enter');
        }else if (await page.getByText('Choose how you want to sign in:').isVisible()){
          await page.getByText('Confirm your recovery email').click();
          await page.locator('[id="knowledge-preregistered-email-response"]').fill("jlbciriaco@gmail.com");
          await page.locator('[id="knowledge-preregistered-email-response"]').press('Enter');
        }
      }

      const createButton = await page.locator('[data-is-column-view-context="true"]');
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

      const saveButton = await page
      .getByRole('button')
      .filter({ hasText: 'Guardar' });
      await saveButton.click();
      await page.waitForTimeout(3000);

      browser.close();
    }

    let respuesta = {
      "status": false,
      "content": "Error mientras se trataba de crear el evento"
    }

    createEvent(title, description, startTime, endTime).then(() => {

      respuesta = {
        "status": true,
        "content": "Evento creado éxitosamente: "+title
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
  const dueDate = (argumentos.dueDate) ? argumentos.dueDate : "";

  const userDataDir = 'C:\\Users\\'+os.userInfo().username+'\\AppData\\Roaming\\Mozilla\\Firefox\\Profiles\\dhq95odj.default-default';

  async function createTask(title: string, description: string, dueDate: string){

    const stealth = require('puppeteer-extra-plugin-stealth')()

    // Add the plugin to playwright (any number of plugins can be added)
      // // Add the plugin to playwright (any number of plugins can be added)
      await firefox.use(stealth);

      const userAgentStrings = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:88.0) Gecko/20100101 Firefox/88.0",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:87.0) Gecko/20100101 Firefox/87.0",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:88.0) Gecko/20100101 Firefox/88.0",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:87.0) Gecko/20100101 Firefox/87.0",
        "Mozilla/5.0 (X11; Linux x86_64; rv:88.0) Gecko/20100101 Firefox/88.0",
        "Mozilla/5.0 (X11; Linux x86_64; rv:87.0) Gecko/20100101 Firefox/87.0"
      ];
  
      // const browser = await chromium.launchPersistentContext(
      const browser = await firefox.launchPersistentContext(
        userDataDir,
        {
          headless: false, // Adjust as needed
        userAgent: userAgentStrings[Math.floor(Math.random() * userAgentStrings.length)],
        viewport: {width: 1920 - 400, height: 1040 - 320}
        }
      );
    
    //add init script
    await browser.addInitScript("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})");
  
    const page = await browser.newPage();

    await page.waitForTimeout(4000);
  
    await page.goto('https://calendar.google.com');

    if(await page.getByText('Usar otra cuenta').isVisible()){
      await page.getByText('Usar otra cuenta').click();
      await page.locator('[type="email"]').fill("testeomindy@gmail.com");
      await page.locator('[type="email"]').press('Enter');

      await page.waitForTimeout(4000);
  
      await page.locator('[type="password"]').fill('claveMindyTest07');
      await page.locator('[type="password"]').press('Enter');

      await page.waitForTimeout(3000);

      if(await page.getByText('Elige el método de acceso:').isVisible()){
        await page.getByText('Confirma el correo de recuperación').click();
        await page.locator('[id="knowledge-preregistered-email-response"]').fill("jlbciriaco@gmail.com");
        await page.locator('[id="knowledge-preregistered-email-response"]').press('Enter');
      }else if (await page.getByText('Choose how you want to sign in:').isVisible()){
        await page.getByText('Confirm your recovery email').click();
        await page.locator('[id="knowledge-preregistered-email-response"]').fill("jlbciriaco@gmail.com");
        await page.locator('[id="knowledge-preregistered-email-response"]').press('Enter');
      }

    }else if(await page.getByText('Sign in').nth(0).isVisible() || await page.getByText('Acceder').nth(0).isVisible()){
      if(await page.getByText('Sign in').nth(0).isVisible()){
        await page.getByText('Sign in').nth(0).click();
      }else if(await page.getByText('Acceder').nth(0).isVisible()){
        await page.getByText('Acceder').nth(0).click();
      }

      await page.waitForTimeout(2000);

      await page.locator('[type="email"]').fill("testeomindy@gmail.com");
      await page.locator('[type="email"]').press('Enter');

      await page.waitForTimeout(4000);
  
      await page.locator('[type="password"]').fill('claveMindyTest07');
      await page.locator('[type="password"]').press('Enter');

      await page.waitForTimeout(3000);

      if(await page.getByText('Elige el método de acceso:').isVisible()){
        await page.getByText('Confirma el correo de recuperación').click();
        await page.locator('[id="knowledge-preregistered-email-response"]').fill("jlbciriaco@gmail.com");
        await page.locator('[id="knowledge-preregistered-email-response"]').press('Enter');
      }else if (await page.getByText('Choose how you want to sign in:').isVisible()){
        await page.getByText('Confirm your recovery email').click();
        await page.locator('[id="knowledge-preregistered-email-response"]').fill("jlbciriaco@gmail.com");
        await page.locator('[id="knowledge-preregistered-email-response"]').press('Enter');
      }
    }

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

    await page.locator('[isfullscreen="false"] [aria-label="Fecha de inicio"]').nth(1).fill(dueDate);

    await page.waitForTimeout(2000);

    const description_note = await page.locator("[isfullscreen='false'] textarea");
    await description_note.fill(description);

    await page.waitForTimeout(2000);
    
    const save_button = await page
    .getByRole('button')
    .filter({ hasText: 'Guardar' });
    save_button.click();

    await page.waitForTimeout(3000);
    browser.close();
  }

  createTask(title, description,dueDate).then(() => {
    let respuesta = {
      "status": true,
      "content": "Tarea creada con éxito: "+title
    }
    event.reply('create_task_google_calendar', respuesta);
  }).catch((e) => {
    let respuesta = {
      "status": false,
      "content": "Error al intentar crear una tarea: "+e
    }
    event.reply('create_task_google_calendar', respuesta);
 })
 
});

ipcMain.on('download_request', async (event, args) => {
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

    event.reply('download_request', imageName);
  } catch (error) {
    console.error('Error downloading image:', error.message);
    event.reply('download_request', 0);
  }

})


ipcMain.on('generate_image', async (event, argumentos) => {

  let prompt = argumentos.prompt;
  let number = (argumentos.number) ? argumentos.number : 1;
  

  const openai = new OpenAI({apiKey:"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"});
  const image = await openai.images.generate({ model: (number == 1) ? "dall-e-3" : "dall-e-2", n: number , prompt });

  const images = [];

  let respuesta = {
    "status": false,
    "content": [
      "Error al intentar generar imágen(es)",
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
        "Imagen(es) generada(s) con éxito",
        images
      ]
    }
  }

  event.reply('generate_image', respuesta);
})

ipcMain.on('create_documents', async (event, argumentos) => {

  var tema = argumentos.subject;

  var texto_completo = "";
  async function generar_contenido(subtema: string){
      var response;
      response = await groq.chat.completions.create({
        messages: [
          { role: 'system', content: "Use markdown to format your answer. Be careful with the headers, dont bold the headers. Dont put any conclusion section in your answer, unless the subtopic includes it. You will explain the user topic in detail."},
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
    model: "gpt-4o-mini",
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

  tema = tema.replaceAll(" ", "_").toLowerCase();

  const output_path = "./"+tema+".pdf";

  // markdownpdf().from.string(texto_completo).to(output_path, function () {
  //   event.reply('generacion_documentos', tema);
  // })
  
  var nodePandoc = require('node-pandoc');

  var args, callback;
  
  // Arguments can be either a single string:
  args = '-f markdown -t pdf -o '+output_path+' --toc=true';

  var respuesta = {
    "status": true,
    "content": "Documento creado con éxito: ```" + tema + "```"
  }
  
  // Set your callback function
  callback = function (err) {
  
    respuesta = {
      "status": false,
      "content": "Error al intentar generar un documento: " + err
    }

    console.log("Error while trying to generate document: " + err.toString());
     
  };
  
  // Call pandoc 
  nodePandoc(texto_completo, args, callback);
  event.reply('create_documents', respuesta);
}) 

ipcMain.on('eliminar_todas_imagenes_clasificacion', async (event) => {
  const directory = 'renderer/public/images/classifiers';

  fs.readdir(directory, (err, files) => {
    if (err) throw err;

    for (const file of files) {
      fs.unlink(path.join(directory, file), err => {
        if (err){
          event.reply('eliminar_todas_imagenes_clasificacion', "Error al intentar eliminar imágenes" + err);
        }
      });
    }
  }
  );

  event.reply('eliminar_todas_imagenes_clasificacion', "Se han eliminado todas las clasificaciones de datos");
}); 

ipcMain.on('go_to_your_mind_palace', async (event) => {
  event.reply('go_to_your_mind_palace');
});

ipcMain.on('show_document', async (event, argumentos) => {
  let file_name = argumentos.document_name;

  // Read the directory contents
  let filesInDir = fs.readdirSync('renderer/public/documents');

  let files = filesInDir.filter((fileName) => fileName.replaceAll("_","").replaceAll("-","").toLowerCase().includes(file_name.toLowerCase().replaceAll("_","").replaceAll("-","")));
  
  if(files.length == 0){
    let respuesta = {
      "status": false,
      "content": "Documento no encontrado."
    };
    event.reply('show_document', respuesta);
  }else{
    //open the document with edge pdf visualizer
    const { exec } = require('child_process');
    exec('start "" "renderer/public/documents/'+files[0]+'"');
    let respuesta = {
      "status": false,
      "content": "El documento se mostró con éxito."
    };
    //After 15 seconds close the pdf visualizer
    setTimeout(() => {
      exec('taskkill /im msedge.exe /f');
    }, 20000);
    event.reply('show_document', respuesta);
  }
});

const dgram = require('dgram');
const WebSocket = require('ws');
const { networkInterfaces } = require('os');
console.log(getIpAddress())
const serverInfo = {
  name: "Mindy",
  ip: getIpAddress(), // Replace with actual server IP
  port: 4321
};

const socket = dgram.createSocket('udp4');
socket.bind(12345);

socket.on('message', (msg, rinfo) => {
  if (rinfo.address !== getIpAddress()) {
    console.log(`Solicitud de descubrimiento recibida de ${rinfo.address}:${rinfo.port}`);
    const message = Buffer.from(JSON.stringify(serverInfo));
    socket.send(message,0, message.length, rinfo.port, rinfo.address);
  }
});

socket.on('listening', () => {
  socket.setBroadcast(true);
});

setInterval(() => {
  const message = Buffer.from(JSON.stringify(serverInfo));
  socket.send(message, 0, message.length, 12345, '255.255.255.255', (err) => {
    if (err) console.error('Failed to send broadcast:', err);
  });
}, 5000); // Broadcast every 5 seconds 

const server = new WebSocket.Server({
  port: 4321
});

server.on('connection', function(socket) {
  // When you receive a message, send that message to every socket.
  socket.on('message', function(msg) {
    var msg_ = msg.toString("utf-8");
    console.log(msg_);
    mainWindow.webContents.send('control-app-mobile', msg_)
  });

  // When a socket closes, or disconnects, remove it from the array.
  socket.on('close', function() {
    console.log('disconnected');
  });
});

function getIpAddress(){ 

  const nets = networkInterfaces();

  for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
          const familyV4Value = typeof net.family === 'string' ? 'IPv4' : 4
          if (net.family === familyV4Value && !net.internal) {
              return net.address;
          }
      }
  }
} 
