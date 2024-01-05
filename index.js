const fs = require('fs');
const http = require('http');
const https = require('https');
const { parse } = require('csv-parse');
const { JSDOM } = require('jsdom');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

// Reading file names from command-line parameters
const inputCSV = process.argv[2]; // the first parameter: input CSV file
const outputCSV = process.argv[3]; // the second parameter: output CSV file

const urlcolumn = "KytaryLink";
const idcolumn = "Registrační číslo";

// Ensure the command line parameters are provided
if (!inputCSV || !outputCSV) {
    console.error('Please provide input and output file names.');
    process.exit(1);
}

// CSV Writer Setup
const csvWriter = createCsvWriter({
    path: outputCSV,
    header: [
        { id: 'id', title: 'Registrační číslo' },
        { id: 'price', title: 'Cena Kytary.cz' }
    ]
});

// Function to download page content
function download(url) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;
        protocol.get(url, (res) => {
            if (res.statusCode !== 200) {
                reject(new Error('Failed to load page, status code: ' + res.statusCode));
                return;
            }
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', (e) => reject(e));
    });
}

// Function to parse HTML and find the price
async function findPrice(url) {
    try {
        const content = await download(url);
        const dom = new JSDOM(content);
        const price = dom.window.document.querySelector('p.alpha').textContent;
        return price;
    } catch (error) {
        console.error(`Error in finding price for ${url}: ${error}`);
        return null;
    }
}

// Main process
async function processCSV() {
    const records = []; // To hold all records

    fs.createReadStream(inputCSV)
        .pipe(parse({ columns: true }))
        .on('data', (row) => records.push(row))
        .on('end', async () => {
            const results = [];
            for (const record of records) {
                console.log("Processing URL: " + record[urlcolumn]);
                const price = await findPrice(record[urlcolumn]);
                results.push({ id: record[idcolumn], price: price });
            }
            csvWriter.writeRecords(results)
                .then(() => console.log('The CSV file was written successfully'));
        });
}

// Run the script
processCSV();