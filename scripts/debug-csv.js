import csv from 'csv-parser';
import fs from 'fs';

const csvPath = '../initial_dataset/1584 - Standard Room Items_Pricing Ranges - Living Room.csv';

console.log('Reading CSV file:', csvPath);

fs.createReadStream(csvPath)
  .pipe(csv())
  .on('data', (row) => {
    console.log('Row:', row);
    console.log('Row values:', Object.values(row));
    console.log('Row keys:', Object.keys(row));
    console.log('---');
  })
  .on('end', () => {
    console.log('Done parsing');
  });
