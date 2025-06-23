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
import { PlaceWithFilter } from './interfaces/types/ResultTableProps';


type SaveXlslDialogArgs = {
  places: PlaceWithFilter[],
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
    width: 1024,
    height: 768,
    resizable: true,
    fullscreen: false,
    webPreferences: {
      devTools: process.env.NODE_ENV === 'development',
      preload: path.join(__dirname, 'preload.js'),
      disableHtmlFullscreenWindowResize: false,
    },
    icon: path.join(__dirname, '../assets/icon.png'),
    backgroundColor: '#ffffff',
    show: false, // Don't show until ready-to-show
  });
  
  // Remove size restrictions
  // mainWindow.setMinimumSize(612, 604);
  // mainWindow.setMaximumSize(612, 604);
  
  // Set proper constraints instead
  mainWindow.setMinimumSize(800, 600);
  
  // Only show window when ready to avoid flicker
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });
  
  // Don't keep window on top
  mainWindow.setAlwaysOnTop(false);

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
      // Sanitize the filename to remove invalid characters
      const sanitizedQuery = args.queryText.replace(/[\\/:*?"<>|]/g, '_');
      
      const resp = await dialog.showSaveDialog(mainWindow, {
        title: 'Save export file',
        defaultPath: path.join(app.getPath('downloads'), sanitizedQuery + '.xlsx'),
        buttonLabel: 'Save', 
        filters: [
          { name: 'XLSX Files', extensions: ['xlsx'] }
        ]     
      });
      
      if (!resp.canceled && resp.filePath) {
        try {
        const workbook = new ExcelJS.Workbook();
          
          // Create worksheets
          const worksheet = workbook.addWorksheet('Businesses');
          const wsWhatsApp = workbook.addWorksheet('WhatsApp Leads');
          const wsChatbot = workbook.addWorksheet('Chatbot Leads');
          const wsUnverified = workbook.addWorksheet('Unverified Leads');
          const wsLowRated = workbook.addWorksheet('Low Rated Leads');
          
          // Define columns
          const columns = [
            { header: 'Name', key: 'name', width: 50, font: {'bold': true} },
            { header: 'Category', key: 'category', width: 30, font: {'bold': true}  },
            { header: 'Phone', key: 'phone', width: 30, font: {'bold': true}  },
            { header: 'Address', key: 'address', width: 50, font: {'bold': true}  },
            { header: 'Google URL', key: 'googleUrl', width: 50, font: {'bold': true}  },
            { header: 'Rating', key: 'rating', width: 15, font: {'bold': true}  },
            { header: 'Reviews', key: 'reviews', width: 15, font: {'bold': true}  },
            { header: 'Website', key: 'website', width: 50, font: {'bold': true}  },
            { header: 'Has WhatsApp', key: 'hasWhatsApp', width: 15, font: {'bold': true} },
            { header: 'WhatsApp Number', key: 'whatsappNumber', width: 20, font: {'bold': true} },
            { header: 'Has Chatbot', key: 'hasChatbot', width: 15, font: {'bold': true} },
            { header: 'Google Verified', key: 'isVerified', width: 15, font: {'bold': true} },
            { header: 'Country', key: 'country', width: 20, font: {'bold': true} },
            { header: 'City', key: 'city', width: 20, font: {'bold': true} },
        ];

          // Apply columns to all worksheets
          worksheet.columns = columns;
          wsWhatsApp.columns = columns;
          wsChatbot.columns = columns;
          wsUnverified.columns = columns;
          wsLowRated.columns = columns;
  
          // Process each place
          for (const place of args.places) {
            // Skip the matchesFilters property when adding to Excel
            const { matchesFilters, ...placeData } = place;
            
            // Prepare row data
            const row = {
              name: placeData.storeName || '',
              category: placeData.category || '',
              phone: placeData.phone || '',
              address: placeData.address || '',
              googleUrl: placeData.googleUrl || '',
              rating: placeData.stars || '',
              reviews: placeData.numberOfReviews || '',
              website: placeData.bizWebsite || '',
              hasWhatsApp: placeData.hasWhatsApp || false,
              whatsappNumber: placeData.whatsAppNumber || '',
              hasChatbot: placeData.isChatbot || false,
              isVerified: placeData.isVerified || false,
              country: placeData.country || '',
              city: placeData.city || ''
            };
            
            // Add to main worksheet
            worksheet.addRow(row);
            
            // Add to specialized worksheets based on criteria
            if (placeData.hasWhatsApp) {
              wsWhatsApp.addRow(row);
            }
            
            if (placeData.isChatbot) {
              wsChatbot.addRow(row);
            }
            
            if (placeData.isVerified === false) {
              wsUnverified.addRow(row);
            }
            
            const rating = parseFloat(placeData.stars) || 0;
            const reviewCount = placeData.numberOfReviews ? parseInt(placeData.numberOfReviews.replace(/,/g, '')) : 0;
            if (rating <= 3.0 || reviewCount < 10) {
              wsLowRated.addRow(row);
            }
          }
          
          // Write the file
          try {
        await workbook.xlsx.writeFile(resp.filePath.toString());
            console.log('File successfully saved at:', resp.filePath);
          } catch (writeError) {
            console.error('Error writing Excel file:', writeError);
            dialog.showErrorBox('File Write Error', 'Failed to write Excel file: ' + writeError.message);
            return Promise.reject(new Error('Failed to write Excel file'));
          }
          
        } catch (innerError) {
          console.error('Error processing places data:', innerError);
          dialog.showErrorBox('Export Error', 'Failed to process data for export: ' + innerError.message);
          return Promise.reject(new Error('Failed to process data for export'));
        }
      }
      
      return resp;
    } catch (e) {
      console.error('Export error:', e);
      dialog.showErrorBox('Export Error', 'Failed to save file: ' + e.message);
      return Promise.reject(e);
    }
  });

  ipcMain.handle("openConfirmDialog", async (event: IpcMainEvent, args: ConfirmDialogArgs) => {
    return dialog.showMessageBox(mainWindow, {
      message: args.title,
      type: 'question',
      buttons: ['No', 'Yes']
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
      // Build location-aware query
      const searchText = args.queryType === 'keyword' 
        ? args.queryValue 
        : null;

      const response = await googleMapScrapperInstance.startScrapping(
        event, 
        args.queryType === 'keyword' 
          ? {
              query: searchText,
              country: args.country,
              city: args.city
            } 
          : {
        url: args.queryValue
            },
        {
          minRating: args.minRating ? parseFloat(args.minRating) : undefined,
          maxRating: args.maxRating ? parseFloat(args.maxRating) : undefined,
          maxReviews: args.maxReviews ? parseInt(args.maxReviews) : undefined,
          excludeVerified: args.excludeVerified,
          requiresWhatsApp: args.checkWhatsApp,
          detectChatbot: args.detectChatbot
        }
      );
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
