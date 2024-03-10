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

const stazioni = readStazioni();

function readStazioni() {
    try {
        const stazioniJson = fs.readFileSync("stazioni.json", 'utf-8');
        // Converte il contenuto JSON in un oggetto JavaScript
        return JSON.parse(stazioniJson);
    } catch (error) {
        console.log(error);
        return [];
    }
}
function writeStazioni(stazioniJson) {//scrive nel file json con unaindendazione di uno spazio
    fs.writeFileSync("stazioni.json", JSON.stringify(stazioniJson, null, 1), 'utf-8');
}


app.get(['/', '/index', 'aggiungi'], (req, res) => {
    res.render('index', );
});

app.get(['/inserimento-dati'], (req, res) => {
    res.render('inserimento-dati', { stazioni: readStazioni() });
});


function aggiornaTemperaturaStazione(nomeStazione, nuovaMaxTemp, nuovaMinTemp) {
    let stazioni = readStazioni();
    let indiceStazione = stazioni.findIndex(staz => staz.nome === nomeStazione);    

    if (indiceStazione !== -1) {
        if (nuovaMaxTemp > stazioni[indiceStazione].MaxTemp || stazioni[indiceStazione].MaxTemp == null) {
            stazioni[indiceStazione].MaxTemp = nuovaMaxTemp;
        }
        if (nuovaMinTemp < stazioni[indiceStazione].MinTemp || stazioni[indiceStazione].MinTemp == null) {
            stazioni[indiceStazione].MinTemp = nuovaMinTemp;
        }
    
    }
    writeStazioni(stazioni);
}
    
    // Aggiungi questo per gestire le route POST
app.post('/inserimento-dati', (req, res) => {
    const { stazione, 'temperatura-massima': MaxTemp, 'temperatura-minima': MinTemp } = req.body;
    
    // Qui vengono eseguiti i controlli di validazione
    let errore = null;
    if (!stazione) {
        errore = 'Selezionare una stazione.';
    } else if (!MaxTemp || isNaN(MaxTemp)) {
        errore = 'Inserire una temperatura massima valida.';
    } else if (!MinTemp || isNaN(MinTemp)) {
        errore = 'Inserire una temperatura minima valida.';
    } else if (parseInt(MinTemp) > parseInt(MaxTemp)) {
        errore = 'La temperatura minima non può essere maggiore della temperatura massima.';
    }

    if (errore) {
        // Se c'è un errore, reindirizza alla pagina di inserimento con un messaggio di errore

        res.render('inserimento-dati', { errore, stazioni: readStazioni() });
    } else {
        // Aggiorna le temperature della stazione e scrivi nel file JSON
        //console.log(stazione, MaxTemp, MinTemp);
        aggiornaTemperaturaStazione(stazione, MaxTemp, MinTemp);

        // Reindirizza l'utente alla pagina di inserimento dati o mostra un messaggio di successo
        res.redirect('/inserimento-dati');
    }
});


app.listen(3000, () => {
    console.log('Server avviato su http://localhost:3000');
});