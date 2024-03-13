const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const path = require("path");
const fs = require("fs");

app.set('view engine', 'pug');
app.set('views', './views');

const RottaPublic = path.join(__dirname, "public");
app.use(express.static(RottaPublic));
app.use(bodyParser.urlencoded({ extended: true }));


function readStazioni() {
    try {
        const stazioniJson = fs.readFileSync("json/stazioni.json", 'utf-8');
        return JSON.parse(stazioniJson);
    } catch (error) {
        console.log(error);
        return [];
    }
}
function writeStazioni(stazioniJson) {
    fs.writeFileSync("json/stazioni.json", JSON.stringify(stazioniJson, null, 1), 'utf-8');
}

function readLog() {
    const filePath = "json/datiLog.json"; // Percorso del file
    try {
        const logJson = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(logJson);
    } catch (error) {
        if (error.code === 'ENOENT') { // Il file non esiste
            console.log("Il file datiLog.json non esiste, ne verrà creato uno nuovo.");
            const defaultContent = []; // Contenuto di default, un array vuoto in questo caso
            writeLog(defaultContent); // Utilizza la funzione writeLog per creare il file
            return defaultContent; // Restituisce il contenuto di default
        } else {
            console.error("Errore nella lettura di datiLog.json:", error);
            return [];
        }
    }
}

function writeLog(logJson) {
    fs.writeFileSync("json/datiLog.json", JSON.stringify(logJson, null, 1), 'utf-8');
}


app.get(['/', '/index', 'aggiungi'], (req, res) => {
    res.render('index',);
});

app.get(['/inserimento-dati'], (req, res) => {
    res.render('inserimento-dati', { stazioni: readStazioni() });
});

app.get(['/riepilogo-dati'], (req, res) => {
    let medie = CalcoloMedia(); 
    res.render('riepilogo-dati', { stazioni: readStazioni(), dati: medie });
});


function aggiornaTemperaturaStazione(nomeStazione, nuovaMaxTemp, nuovaMinTemp) {
    let stazioni = readStazioni();
    let indiceStazione = stazioni.findIndex(staz => staz.nome === nomeStazione);

    nuovaMaxTemp = Number(nuovaMaxTemp);
    nuovaMinTemp = Number(nuovaMinTemp);

    if (indiceStazione !== -1) {
        if (stazioni[indiceStazione].MaxTemp === null || nuovaMaxTemp > stazioni[indiceStazione].MaxTemp) {
            stazioni[indiceStazione].MaxTemp = nuovaMaxTemp;
        }

        if (stazioni[indiceStazione].MinTemp === null || nuovaMinTemp < stazioni[indiceStazione].MinTemp) {
            stazioni[indiceStazione].MinTemp = nuovaMinTemp;
        }
    } else {
        stazioni.push({
            nome: nomeStazione,
            MaxTemp: nuovaMaxTemp,
            MinTemp: nuovaMinTemp
        });
    }
    writeStazioni(stazioni);
}


function logInserimento(nomeStazione, MaxTemp, MinTemp) {
    let logDati = readLog();

    logDati.push({
        nomeStazione: nomeStazione,
        MaxTemp: MaxTemp,
        MinTemp: MinTemp,
        timestamp: new Date().toISOString()
    });

    writeLog(logDati);
}

function CalcoloMedia() {
    let dati = readLog();
    let somme = {};
    let conteggi = {};
    let medie = {};

    dati.forEach((misurazione) => {
        const { nomeStazione, MaxTemp, MinTemp } = misurazione;
        //inizializza se non è stato ancora trovata una stazione con quel nome
        if (!somme[nomeStazione]) {
            somme[nomeStazione] = { max: 0, min: 0 };
            conteggi[nomeStazione] = 0;
        }
        //aggiungo all'attributo max di somme il valore intero decimale di maxtemp
        somme[nomeStazione].max += parseInt(MaxTemp, 10);
        somme[nomeStazione].min += parseInt(MinTemp, 10);
        conteggi[nomeStazione] += 1;
    });

    // Object.keys prende l'oggetto somme e mette la sua chiave principale come stringa (i nomi delle stazioni) e li inizializza come "nome"
    Object.keys(somme).forEach((nome) => {
        medie[nome] = {
            //toFixed(2) arrotonda a due cifre decimali
            mediaMax: (somme[nome].max / conteggi[nome]).toFixed(2),
            mediaMin: (somme[nome].min / conteggi[nome]).toFixed(2),
        };
    });

    return medie;
}

function readLog() {
    try {
        const logJson = fs.readFileSync("json/datiLog.json", 'utf-8');
        return JSON.parse(logJson);
    } catch (error) {
        console.log(error);
        return [];
    }
}



app.post('/inserimento-dati', (req, res) => {
    const { stazione, 'temperatura-massima': MaxTemp, 'temperatura-minima': MinTemp } = req.body;

    let errore = null;
    if (!stazione) {
        errore = 'Selezionare una stazione.';
    } else if (!MaxTemp || isNaN(parseFloat(MaxTemp))) {
        errore = 'Inserire una temperatura massima valida.';
    } else if (!MinTemp || isNaN(parseFloat(MinTemp))) {
        errore = 'Inserire una temperatura minima valida.';
    } else if (parseFloat(MinTemp) > parseFloat(MaxTemp)) {
        errore = 'La temperatura minima non può essere maggiore della temperatura massima.';
    }

    if (errore) {
        res.render('inserimento-dati', { errore, stazioni: readStazioni() });
    } else {
        aggiornaTemperaturaStazione(stazione, MaxTemp, MinTemp);
        logInserimento(stazione, MaxTemp, MinTemp);
        res.redirect('/inserimento-dati');
    }
});


app.listen(3000, () => {
    console.log('Server avviato su http://localhost:3000');
});