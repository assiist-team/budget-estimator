import csv from 'csv-parser';
import fs from 'fs';

console.log('Testing CSV parsing...');

fs.createReadStream('../initial_dataset/1584 - Standard Room Items_Pricing Ranges - Living Room.csv')
  .pipe(csv())
  .on('data', (row) => {
    console.log('Row keys:', Object.keys(row));
    console.log('Row values:', Object.values(row));
    console.log('Full row:', row);
    console.log('---');
  })
  .on('end', () => console.log('Parsing complete'));
