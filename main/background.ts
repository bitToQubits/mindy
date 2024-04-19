import path from 'path'
import { app, ipcMain } from 'electron'
import serve from 'electron-serve'
import { createWindow } from './helpers'
import { chromium, Page } from 'playwright';
import os from 'node:os'

const isProd = process.env.NODE_ENV === 'production'

if (isProd) {
  serve({ directory: 'app' })
} else {
  app.setPath('userData', `${app.getPath('userData')} (development)`)
}

;(async () => {
  await app.whenReady()

  const mainWindow = createWindow('main', {
    width: 1000,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  })

  if (isProd) {
    await mainWindow.loadURL('app://./home')
  } else {
    const port = process.argv[2]
    await mainWindow.loadURL(`http://localhost:${port}/home`)
  }
})()

app.on('window-all-closed', () => {
  app.quit()
})

ipcMain.on('message', async (event, arg) => {
  const userDataDir = 'C:\\Users\\'+os.hostname()+'\\AppData\\Local\\Google\\Chrome\\User Data';
  const profileDirectory = 'Default';

  async function automate(){
    const browser = await chromium.launchPersistentContext(
      userDataDir, 
      {
        headless: false, // Adjust as needed
        args: [`--profile-directory=${profileDirectory}`]
      }
    );
  
    const page = await browser.newPage();
  
    await page.goto('https://calendar.google.com');
    await page.waitForTimeout(2000); 
  
    async function createEvent(title: string, description: string, startTime: string, endTime: string) {
      console.log("Llego aqui")
      const createButton = await page.waitForSelector('[data-is-column-view-context="true"]');
      await createButton.click();
      await page.waitForTimeout(1000);
  
      const titleInput = await page.locator("[isfullscreen='false'] input[type='text']").first();
      await titleInput.fill(title);
  
      const descriptionInput = await page.locator("[isfullscreen='false'] [contenteditable='true']");
      await descriptionInput.click(); 
      await descriptionInput.fill(description);
  
      var startDateInput = await page.locator("[isfullscreen='false'] [data-key='startDate']");
      await startDateInput.click();
      startDateInput = await page.locator("[isfullscreen='false'] input[type='text']");
      await startDateInput.nth(1).fill(startTime)
  
      const end_input = await page.locator("[isfullscreen='false'] input[type='text']")
      await end_input.nth(4).fill(endTime)
  
      const saveButton = await page.locator('[isfullscreen="false"] button').nth(28);
      await saveButton.click();
      await page.waitForTimeout(3000);
    }
  
    async function createTask(page: Page, title: string, description: string, dueDate: string){
      const createButton = await page.locator('[data-is-column-view-context="true"]');
      await createButton.click();
  
      const elegir_boton_task = await page.locator("[isfullscreen='false'] [id='tabTask']");
      await elegir_boton_task.click();
  
      const title_input = await page.locator("[isfullscreen='false'] input[type='text']")
      await title_input.nth(0).fill(title);
  
      var fecha_cierre = await page.locator('[isfullscreen="false"] button')
      await fecha_cierre.nth(21).click();
  
      fecha_cierre = await page.locator('[isfullscreen="false"] input[type="text"]');
      await fecha_cierre.nth(7).fill(dueDate);
  
      const description_note = await page.locator("[isfullscreen='false'] textarea");
      description_note.fill(description);
      
      const save_button = await page.locator('[isfullscreen="false"] button');
      save_button.nth(28).click();
    }
  
    console.log("Llego aqui 105")
    createEvent("Elison Perez", "Miren", "2024-02-26 10:00 PM", "2024-02-26 11:00 PM");
    console.log("Llego aqui 107")
  }

  automate();
  
  event.reply('message', `Accion completada`);
})
