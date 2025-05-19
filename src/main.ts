import { app, BrowserWindow, ipcMain, IpcMainEvent, shell, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import OpenDefaultBrowserArgs from './interfaces/types/OpenDefaultBrowserArgs';
import ErrorAlertArgs from './interfaces/types/ErrorAlertArgs';
import ConfirmDialogArgs from './interfaces/types/ConfirmDialogArgs';
import OnSubmitReturnForm from './interfaces/types/OnSubmitReturnForm';
import log from 'electron-log/main';
import GoogleMapScrapper from'./helpers/google-map-scrapper';
import * as ExcelJS from "exceljs";
import Place from './interfaces/types/Place';


type SaveXlslDialogArgs = {
  places: Place[],
  queryText: string
}

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

const googleMapScrapperInstance = new GoogleMapScrapper();

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 612,
    height: 604,
    resizable: false,
    fullscreen: false,
    webPreferences: {
      devTools: process.env.NODE_ENV === 'development',
      preload: path.join(__dirname, 'preload.js'),
      disableHtmlFullscreenWindowResize: true,
    },
  });
  mainWindow.setMinimumSize(612, 604);
  mainWindow.setMaximumSize(612, 604);
  mainWindow.setAlwaysOnTop(true);

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  ipcMain.on("openDefaultBrowser", async (event: IpcMainEvent, args: OpenDefaultBrowserArgs) => {
    shell.openExternal(args.url);
  });

  ipcMain.on("showErrorAlert", async (event: IpcMainEvent, args: ErrorAlertArgs) => {
    dialog.showErrorBox(args.title, args.content);
  });

  ipcMain.handle("showSaveXlsxDialog", async (event: IpcMainEvent, args: SaveXlslDialogArgs): Promise<object | Error> => {
    try {
      const resp = await dialog.showSaveDialog(mainWindow, {
        title: 'Save export file',
        defaultPath: path.join(app.getPath('downloads'), args.queryText + '.xlsx'),
        buttonLabel: 'Save', 
        filters: [
          { name: 'XLSX Files', extensions: ['xlsx'] }
        ]     
      });
      if (!resp.canceled) {
        const workbook = new ExcelJS.Workbook();
        // Force workbook calculation on load
        // workbook.calcProperties.fullCalcOnLoad = true;
        const worksheet = workbook.addWorksheet('Database Kontak');
        worksheet.columns = [
          { header: 'Nama', key: 'nama', width: 50, font: {'bold': true} },
          { header: 'Kategori', key: 'kategori', width: 30, font: {'bold': true}  },
          { header: 'No. HP', key: 'no_hp', width: 100, font: {'bold': true}  },
          { header: 'Alamat', key: 'alamat', width: 100, font: {'bold': true}  },
          { header: 'URL Google', key: 'url_google', width: 100, font: {'bold': true}  },
          { header: 'Rating', key: 'rating', width: 50, font: {'bold': true}  },
          { header: 'Jlh Pemberi Rating', key: 'pemberi_rating', width: 50, font: {'bold': true}  },
          { header: 'Website', key: 'website', width: 100, font: {'bold': true}  },
        ];

        args.places.map(place => [
          worksheet.addRow({
            nama: place.storeName,
            kategori: place.category,
            alamat: place.address,
            no_hp: place.phone,
            url_google: place.googleUrl,
            rating: place.stars,
            pemberi_rating: place.numberOfReviews,
            website: place.bizWebsite ? place.bizWebsite : ''
          })
        ]);

        // fs.writeFile(
        //   resp.filePath.toString(), 
        //   csvString, function (err) { 
        //     if (err) throw err; 
        //     console.log('Saved!'); 
        // });
        // console.log('resp', resp)
        await workbook.xlsx.writeFile(resp.filePath.toString());

      }
      return Promise.resolve(resp);
    } catch (e) {
      Promise.reject(e);
    }
  });

  ipcMain.handle("openConfirmDialog", async (event: IpcMainEvent, args: ConfirmDialogArgs) => {
    return dialog.showMessageBox(mainWindow, {
      message: args.title,
      type: 'question',
      buttons: ['Tidak', 'Ya']
    }).then(resp => {
      console.log('resp', resp)
      return Promise.resolve(resp.response === 1)
    }).catch(e => {
      return Promise.reject(e)
    });
  });

  ipcMain.on("startGoogleMapScrappingTask", async (event: IpcMainEvent, args: OnSubmitReturnForm) => {
    // Send result back to renderer process
    try {
      const response = await googleMapScrapperInstance.startScrapping(event, args.queryType === 'keyword' ? {
        query: args.queryValue + (args.queryValueLocation? ' di ' + args.queryValueLocation : '')
      } : {
        url: args.queryValue
      });
      // event.sender.send('receiveResultGoogleMapScrapperForm', response);
    } catch (error) {
      // event.sender.send('errorResultGoogleMapScrapperForm', error);
      log.info(error);
    }
  });

  ipcMain.on("stopGoogleMapScrappingTask", async () => {
    // Send result back to renderer process
    try {
      await googleMapScrapperInstance.stopScrapping();
      // event.sender.send('receiveResultGoogleMapScrapperForm', response);
    } catch (error) {
      // event.sender.send('errorResultGoogleMapScrapperForm', error);
      log.info(error);
    }
  });

  // ipcMain.handle("exportResultsDialog", async (event: IpcMainEvent, args: ConfirmDialogArgs) => {
  //   return dialog.showMessageBox(mainWindow, {
  //     message: args.title,
  //     type: 'question',
  //     buttons: ['Tidak', 'Ya']
  //   }).then(resp => {
  //     console.log('resp', resp)
  //     return Promise.resolve(resp.response === 1)
  //   }).catch(e => {
  //     return Promise.reject(e)
  //   });
  // });

  // Open the DevTools.
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
