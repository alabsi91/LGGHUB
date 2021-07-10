const util = require('util');
const execSync = require('child_process').execSync;
const exec = util.promisify(require('child_process').exec);
const fs = require('fs');
const readFileAsync = util.promisify(fs.readFile);
const readDirAsync = util.promisify(fs.readdir);
const VDF = require('./vdf-parser');

console.log('\x1b[41m%s\x1b[0m', '\n ---- //// ---- Make sure to run this as Administrator ---- //// ---- \n');

const wait = t => new Promise((res, err) => setTimeout(res, t));

async function app() {
  // check if ghub exist
  const isGhub = (await readDirAsync('C:/Program Files/')).filter(e => e.includes('LGHUB')).length > 0;
  if (!isGhub) {
    console.log('\x1b[91m%s\x1b[0m', "Can't find Logitech G HUB app installed on this device.");
    return;
  }
  const Ghub = require('C:/Program Files/LGHUB/data/applications.json');

  // copy applications.json file as a backup.
  await exec(`echo n | copy /-y "C:\\Program Files\\LGHUB\\data\\applications.json" "Backup\\applications.json"`);

  console.log(
    '\x1b[92m%s\x1b[0m',
    '\nCreating backup for Logitech G HUB database from',
    '\x1b[93m',
    'C:\\Program Files\\LGHUB\\data\\applications.json \n'
  );

  // check registry for steam location
  let steamUrl;
  try {
    const stdout = execSync(`REG QUERY "HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\Valve\\Steam" /v InstallPath`, {
      stdio: 'pipe',
    });
    steamUrl = stdout?.toString()?.split('REG_SZ')?.[1]?.trim();
    console.log('\x1b[33m%s\x1b[0m', 'Steam.exe', '\x1b[96m', 'founded in:', '\x1b[93m', steamUrl);
  } catch (e) {
    if (e.stderr) {
      console.log('\x1b[41m%s\x1b[0m', 'Error: steam not found on this device.');
      return;
    }
  }

  // get steam library location from .vdf file
  const isVdfExist = (await readDirAsync(steamUrl + '\\steamapps')).filter(e => e.includes('libraryfolders.vdf')).length > 0;
  let steamLib;
  if (isVdfExist) {
    const vdfData = await readFileAsync(steamUrl + '\\steamapps\\libraryfolders.vdf', 'utf8');
    const isOldVdf = VDF.parse(vdfData)?.LibraryFolders;
    const isOtherLibExist = VDF.parse(vdfData)?.libraryfolders?.['1'];
    if (isOldVdf) {
      console.log('\x1b[92m%s\x1b[0m', '\nYour data does not need any changes, all good\n');
      return;
    } else if (isOtherLibExist) {
      steamLib = VDF.parse(vdfData)?.libraryfolders?.['1']?.path?.replace(/\\\\/g, '\\');
      await wait(300);
      console.log('\x1b[33m%s\x1b[0m', 'Steam library', '\x1b[96m', 'founded in:', '\x1b[93m', steamLib + '\n');
    } else {
      steamLib = 'C:\\Program Files (x86)\\Steam';
      await wait(300);
      console.log(
        '\x1b[96m%s\x1b[0m',
        'No other steam library has found',
        '\x1b[33m',
        'Steam library',
        '\x1b[96m',
        'by defaule set to:',
        '\x1b[93m',
        steamLib + '\n'
      );
    }
  } else {
    steamLib = 'C:\\Program Files (x86)\\Steam';
    await wait(300);
       console.log(
         '\x1b[96m%s\x1b[0m',
         'libraryfolders.vdf file not found',
         '\x1b[33m',
         'Steam library',
         '\x1b[96m',
         'by defaule set to:',
         '\x1b[93m',
         steamLib + '\n'
       );
  }

  // get games names and games folder names from .acf files
  const lib = steamLib + '\\steamapps';
  const res = (await readDirAsync(lib)).filter(e => e.includes('.acf'));
  let games = [];
  for (let i = 0; i < res.length; i++) {
    const path = lib + '\\' + res[i];
    const data = await readFileAsync(path, 'utf8');
    const gameName = VDF.parse(data).AppState.name;
    const gameDir = VDF.parse(data).AppState.installdir;
    games.push({ name: gameName, dir: gameDir });
    await wait(300);
    console.log(
      '\x1b[33m%s\x1b[0m',
      '-' + gameName + '-',
      '\x1b[96m',
      ' founded in: ',
      '\x1b[93m',
      lib + '\\common\\' + gameDir + '\\'
    );
  }

  // check game if it exist in ghub applications.json file
  for (let i = 0; i < games.length; i++) {
    const gameName = games[i].name;
    const gameDir = games[i].dir;
    const index = Ghub.applications.findIndex(e => e.name === gameName);
    if (index !== -1) {
      await wait(300);
      console.log('\x1b[33m%s\x1b[0m', '\n-' + gameName + '-', '\x1b[96m', 'exist in Logitech G HUB database');
      const reg = {
        winRegistry: {
          registryKey: 'Path',
          registryPath: 'HKEY_LOCAL_MACHINE/SOFTWARE/GHub/' + gameName,
        },
      };
      // add detection registry method for every game if method not exist
      if (Ghub.applications[index].detection.filter(e => e?.winRegistry?.registryKey === 'Path').length === 0) {
        Ghub.applications[index].detection.push(reg);
        await wait(300);

        console.log('\x1b[92m%s\x1b[0m', 'adding registry detection method to Logitech G HUB database.');
        try {
          const stdout = execSync(
            `REG ADD "HKEY_LOCAL_MACHINE\\SOFTWARE\\GHub\\${gameName}" /v "Path" /t REG_SZ /f /d "${steamLib}\\steamapps\\common\\${gameDir}"`,
            { stdio: 'pipe' }
          );
          await wait(300);
          console.log(
            '\x1b[92m%s\x1b[0m',
            'adding',
            '\x1b[33m',
            '-' + gameName + '-',
            '\x1b[92m',
            'to registry: ' + stdout,
            '\x1b[0m'
          );
        } catch (e) {
          if (e.stderr) console.error('\x1b[91m%s\x1b[0m', 'Error: Access denied \nMake sure to run this as Administrator');
        }
      } else {
        await wait(300);
        console.log('\x1b[90m%s\x1b[0m', 'Skiped: Registry detection method already exist in Logitech G HUB database.');
      }
    }
  }

  // overwrite applications.json with new data
  fs.writeFile('C:/Program Files/LGHUB/data/applications.json', JSON.stringify(Ghub, null, '\t'), async err => {
    if (err) return console.error('\x1b[91m%s\x1b[0m', '\nError: Access denied \nMake sure to run this as Administrator\n');
    await wait(300);
    console.log('\x1b[92m%s\x1b[0m', '\n-- All Done --');
    await wait(300);
    console.log('\x1b[92m%s\x1b[0m', '\nOpen Logitech G HUB app and press scan for games.\n');
  });
}
app();
