import path from 'path'
import { app, ipcMain, clipboard,nativeImage } from 'electron'
import serve from 'electron-serve'
import { createWindow } from './helpers'
import { chromium, Page } from 'playwright';
import os from 'node:os';
import axios from 'axios';
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from 'fs';
import { ElevenLabsClient, stream, play  } from "elevenlabs";

const unidecode = require('unidecode'); 

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
    console.log("error 56: ", response)
    return response;
    }).catch(function (error) {
      console.log("error 59: ",error)
    return error;
  });;

  await play(audio).then(function (response) {
    console.log("error 64: ", response)
    return response;
    }).catch(function (error) {
      console.log("error 67", error)
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

    console.log(files);
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

const automate_3 = async function (tema: string, plantilla: string = ""){
  var indices_a_eliminar = [];
  const userDataDir = 'C:\\Users\\'+os.userInfo().username+'\\AppData\\Local\\Google\\Chrome\\User Data';
  const profileDirectory = 'Default';

  async function removeCharsByIndex(text, indicesToRemove) {
    let result = "";
    for (let i = 0; i < text.length; i++) {
        if (!indicesToRemove.includes(i)) {
            result += text[i];
        }
    }
    return result;
  }

  const isNumeric = (n: any): boolean => {
    return !isNaN(parseFloat(n)) && isFinite(n);
  };

  let tematica = "";
  let tematica_imagenes = [];
  let identificar_tematica = false;
  let count = 0;
  var model;
  var text_input;
  let saltos_linea = 0;

  let texto_completo = "";

  async function generar_contenido(subtema: string, continuacion: string){
      await page.setDefaultTimeout( 60000 * 10 )
      var response;
      if(continuacion == ""){
        response = await model.generateContentStream("Use markdown to format your answer, use ONLY ###,####, #### for titles. Dont put any conclusion section in your answer, unless the subtopic includes it. Explain the following topic in detail: subtopic:" + subtema + " general topic:" + tema)
      }else{
        response = await model.generateContentStream("Use markdown to format your answer, use ONLY ###,####,#### for titles. Dont put any conclusion section in your answer, unless the subtopic includes it. The general topic is "+tema+" . Continue the following topic in detail, from this line: "+continuacion)
      }

      var markdown = false;
      var markdown_2 = false;

      for await (const chunk of response.stream){
        let texto = "";
        try{
          texto = chunk.text();
          console.log("ohoh, 88", texto); 
        }catch{
          console.log("dada")
          if(response.candidates[0].finish_reason == "RECITATION"){
            await generar_contenido(subtema, response.candidates[0].content.parts.text).then(function () {
              console.log("excellent 2")
            })
            .catch(function (error) {
              console.log("Error: " + error)
            });
          }
        }

        console.log(texto)

        indices_a_eliminar = [];

        for (var i = 0; i < texto.length - 1; i++){
          count += 1;

          if(markdown && texto[i] == "\n" && !((texto[i + 1] == "*" || texto[i + 1] == "-" || texto[i + 1] == "\n" || texto[i + 1] == " ")  && (i + 2 < texto.length && texto[i + 2] == " "))){
            markdown = false
          }else if(markdown_2 && texto[i] == "\n" && !(texto[i + 1] == "\n" || texto[i + 1] == " " || (isNumeric(texto[i + 1]) && (i + 2 < texto.length && texto[i + 2] == ".")))){
            markdown_2 = false
          }

          if(markdown && (texto[i] == "*" || texto[i] == "-") && texto[i + 1] == " " && (i == 0 || (texto[i - 1] != "*"))){
            indices_a_eliminar.push(i)
            indices_a_eliminar.push(i + 1)
          }else if(markdown_2 && isNumeric(texto[i]) && texto[i + 1] == "."){
            indices_a_eliminar.push(i)
            indices_a_eliminar.push(i + 1)
          }

          if(!markdown && (texto[i] == "*" || texto[i] == "-") && texto[i + 1] == " " && (i == 0 || (texto[i - 1] != "*"))){
            markdown = true
          }else if (!markdown_2 && isNumeric(texto[i]) && texto[i + 1] == "."){
            markdown_2 = true
          }else{
              if(!markdown){
                //En caso que la respuesta de la api sea incompleta
                if(texto[i] == " "){
                  if(texto_completo.length >= 2 && (texto_completo[texto_completo.length-2] == "*" || texto_completo[texto_completo.length-2] == "-") && !(texto_completo.length == 2 || texto_completo[texto_completo.length-3] == "*")){
                    markdown = true
                  }else if(texto_completo.length >= 1 && (texto_completo[texto_completo.length-1] == "*" || texto_completo[texto_completo.length-1] == "-") && !(texto_completo.length == 1 || texto_completo[texto_completo.length-2] == "*")){
                    markdown = true
                  }
                }
              }else if (!markdown_2){
                  if(texto[i] == "."){
                    if(texto_completo.length >= 2 && isNumeric(texto_completo[texto_completo.length-2])){
                      markdown_2 = true
                    }else if(texto_completo.length >= 1 && isNumeric(texto_completo[texto_completo.length-1])){
                      markdown_2 = true
                    }
                  }
              }
          }

          if(count >= 75){
            await page.mouse.wheel(0, 60)
            count = 0
          }

        }

        let texto_final = await unidecode(await removeCharsByIndex(texto,indices_a_eliminar))

        if(texto_final != ""){
          texto_completo += await texto_final
          // text_input = await page.locator(".kix-canvas-tile-content").last();
          await text_input.pressSequentially(texto_final)
        }
      }

      await page.keyboard.press("Enter");
      await page.keyboard.press("Enter");
  }

  const openai_client = new OpenAI({apiKey:"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"});

  let respuesta_division_tematica_openai = await openai_client.chat.completions.create({
    messages: [{"role": "system", "content": "Your task will be to divide a topic by thematic points. Output a list separated by comas, only the topic, subtopics and the comas. The topic will be preceed by -- to distinct itself from the subtopics."},
        {"role": "user", "content": tema}],
    model: "gpt-4-turbo",
  })

  var division_temas = respuesta_division_tematica_openai.choices[0].message.content.split(",");

  console.log(division_temas)

  for(var i = 0; i < division_temas.length; i++){
    if(division_temas[i].trim().startsWith("--")){
      tema = division_temas[i].replace("--", "");
      division_temas.splice(i,1);
      break;
    }
  }

  const browser = await chromium.launchPersistentContext(
    userDataDir, 
    {
      headless: false, // Adjust as needed
      args: [`--profile-directory=${profileDirectory}`]
    }
  );

  var page = await browser.newPage();

  page.setDefaultTimeout( 60000 );

  await page.goto('https://docs.google.com/document/u/0/');

  let no_se_pudo_encontrar_plantilla = true;

  if(plantilla != ""){
    let buscador = await page.locator("[name='q']");
    await buscador.fill(plantilla);

    let boton_busqueda = await page.locator("form[role='search'] button");
    await boton_busqueda.nth(2).click();

    let plantillas = await page.locator(".docs-homescreen-grid-item");

    await page.waitForTimeout(2500);

    if(await plantillas.count() >= 1 && await plantillas.nth(0).isVisible()){
      await plantillas.nth(0).click();
      no_se_pudo_encontrar_plantilla = false;

      page.waitForLoadState();
      await page.waitForTimeout(2000);

      let menu_archivo = await page.locator("#docs-file-menu");
      await menu_archivo.first().click();

      menu_archivo = await page.locator('.goog-menuitem.apps-menuitem');
      await menu_archivo.nth(3).click();

      await page.waitForTimeout(2000);

      menu_archivo = await page.locator('.docs-copydocdialog-elements input');
      await menu_archivo.nth(0).fill(tema);

      await page.waitForTimeout(2000);

      menu_archivo = await page.locator("button[name='copy']");

      const promesaPag = browser.waitForEvent('page');
      await menu_archivo.first().click();
      const newPage = await promesaPag;
      await newPage.waitForLoadState();
      page = newPage;

    }else{
      await page.goto("https://docs.google.com/document/?usp=docs_alc&authuser=0")
    }
  }

  text_input = page.locator(".kix-canvas-tile-content").last();

    if(no_se_pudo_encontrar_plantilla){
      let plantillas = await page.locator(".docs-homescreen-templates-templateview")
      plantillas.nth(0).click()
      let titulo = await page.locator(".docs-title-input")
      await titulo.clear()
      await titulo.fill(tema)
    }else{
      const terminos_a_remplazar_plantilla = {
        "Nombres:" : "Jorge Luis Báez",
        "Curso:" : "5to Informática",
        "Materia:" : "-",
        "Profesor@:" : "Elison Perez",
        "Colegio:" : "Colegio Preuniversitario Pedro Henriquez Ureña",
        "Año escolar:" : "2023-2024",
        "Tema:" : tema
      }

      for (let [llave, termino] of Object.entries(terminos_a_remplazar_plantilla)){

        await page.mouse.wheel(0, 100);

        await page.keyboard.press("Control+f")
        await page.locator('[role="searchbox"]').fill(llave)
        await page.keyboard.press("Enter")
        await page.locator('.docs-slidingdialog-button-close').click()
        await page.keyboard.press("ArrowRight")
        await page.locator('#boldButton').click()
        await text_input.pressSequentially(unidecode(" " + termino))
      }
    }

    if(!no_se_pudo_encontrar_plantilla){
      await page.keyboard.press("PageDown")
      await page.keyboard.press("PageDown")

      for(var i = 0; i < 20; i++){
        await page.keyboard.press("ArrowDown");
      }

      await page.keyboard.press("Control+Enter");

    }else{
      await text_input.click();
      await text_input.focus();
    }

    await text_input.pressSequentially("# "+tema);
    await page.keyboard.press("Enter");
    await page.keyboard.press("Enter");

    await text_input.pressSequentially("## Table of Contents");
    await page.keyboard.press("Enter");

    let insertar_opcion = await page.locator("#docs-insert-menu")
    await insertar_opcion.click()
    insertar_opcion = await page.locator(".goog-menuitem.apps-menuitem.goog-submenu");
    await insertar_opcion.nth(19).hover();
    insertar_opcion = await page.locator('.docs-preview-palette-item');
    await insertar_opcion.nth(7).click();

    await page.keyboard.press("Enter");

    const genAI = new GoogleGenerativeAI("AIzaSyAiB6m3aUuRaXMHthpNeLFoYcQI5wmcdIk");

    model = genAI.getGenerativeModel({ model: "gemini-pro"});

    for (let subtema of division_temas){
      await text_input.pressSequentially("## " + subtema);
      await page.keyboard.press("Enter");
      await generar_contenido(subtema, "").then(function () {
        console.log("Exito")
      })
      .catch(function (error) {
        console.log("Error: ", error)
      });
    }

    page.setDefaultTimeout( 60000 );

    console.log("llega aqui 315")

    count = 0;

    for await (let caracter of texto_completo){
      if(count >= 83){
        saltos_linea += 1
        count = 0
      }

      saltos_linea += (caracter.match(/\n/g) || []).length;

      if(caracter.startsWith("#")){
        identificar_tematica = true
      }

      if(identificar_tematica){
        if(caracter.includes("\n")){
            tematica+=caracter
            if(tematica_imagenes.length < 2){
              tematica_imagenes.push((tematica.replace("\n", ""), saltos_linea))
            }
            identificar_tematica = false
            tematica = ""
        }else{
          tematica+=caracter
        }
      }
    }

    await page.keyboard.press("Control+f");

    await page.locator('[role="searchbox"]').fill(tema);

    await page.keyboard.press("Enter");

    let contab = await page.locator(".docs-findinput-count").textContent();
    let primer_par_numero = "";

    for (let c of contab){
      if(c != " "){
        primer_par_numero+=c;
      }else{
        break;
      }
    }

    while (primer_par_numero != "1"){
      await page.locator('#docs-findbar-button-next').click();
      contab = await page.locator(".docs-findinput-count").textContent();
      primer_par_numero = "";
      for (let c of contab){
        if(c != " "){
          primer_par_numero+=c;
        }else{
          break;
        }
      }
    }

    await page.locator('.docs-slidingdialog-button-close').click()

    await page.keyboard.press("ArrowRight")

    while(await page.locator('.kix-toc-bubble-reload-bubble.goog-inline-block').isHidden()){
      await page.keyboard.press("ArrowDown");
    }

    //boton de refrescar
    await page.locator('.kix-toc-bubble-reload-bubble.goog-inline-block').click()

    await page.keyboard.press("ArrowDown");

    await page.waitForTimeout(12000);

    browser.close();
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

      console.log("79:", img)

      var imagen = await axios.get(img, {responseType: 'arraybuffer'}).then(function (response) {
        return response;
      })
      .catch(function (error) {
        console.log(error)
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
        console.log(await contenidos_elementos.nth(i).evaluate(node => node.innerText))
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
      console.log('137 handle success here');
      return imagen_url
   }).catch((e) => {
      console.log('140 handle error here: ', e.message)
      return ""
   });
  }

  if(output.length > 0){
    await crear_nota(termino, output, img).then(() => {
      console.log('147 handle success here');
   }).catch((e) => {
      console.log('149 handle error here: ', e.message)
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

  console.log("Llego aqui 105")
  createEvent("Elison Perez", "Miren", "2024-02-26 10:00 PM", "2024-02-26 11:00 PM").then(() => {
    console.log('handle success here');
 }).catch((e) => {
    console.log('handle error here: ', e.message)
 })
  console.log("Llego aqui 107")
  browser.close();
}

ipcMain.on('message', async (event, arg) => {

  automate_6("Hola soy elison perez").then(() => {
    
 }).catch((e) => {
    console.log('258 handle error here: ', e.message)
 })
   
  event.reply('message', `Accion completada`);
})  