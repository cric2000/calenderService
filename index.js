const http = require('http');
const url = require('url');
const querystring = require('querystring');
const fsPromises = require('fs').promises;
const fs = require('fs');
const path = require('path');
const { addDays, subDays, format, isLeapYear } = require('date-fns');

// function for handling date input in the query
function parseDate(dateStr) {
    const dateMatch = dateStr.match(/^(?:\d{2}-[A-Za-z]{3}-\d{4}|\d{2}-\d{2}-\d{4})$/);

    if (dateMatch) {
        const [, day, monthStr, year] = dateStr.match(/^(\d{2}|[A-Za-z]{3})-(\d{2}|[A-Za-z]{3})-(\d{4})/);
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        let month;

        if (isNaN(monthStr)) {
            month = months.findIndex((m) => m.toLowerCase() === monthStr.toLowerCase());
        } else {
            month = parseInt(monthStr) - 1;
        }

        if ((month < 0 || month > 11 || parseInt(day) < 1 || parseInt(day) > 31) || (month === 10 && parseInt(day) > 30) || (month === 1 && parseInt(day) > 29) || parseInt(year) === 0) {
            throw new Error('Invalid month, day, or year in date format');
        }

        const parsedDate = new Date(parseInt(year), month, parseInt(day), 0, 0, 0, 0);

        if (month === 1 && parseInt(day) === 29) {
            const fullYear = parseInt(year);
            if (!isLeapYear(parsedDate)) {
                throw new Error('The specified year is not a leap year.');
            }
        }

        return parsedDate;
    } else {
        throw new Error('Invalid date format. Use dd-MMM-yyyy format like 20-Nov-2000 or 20-11-2000');
    }
}

// function for handling invalid values
function validateAndParseInt(str) {
    if (/^\d+$/.test(str)) {
        const parsedValue = parseInt(str, 10);
        if (!isNaN(parsedValue) && parsedValue <= 99999) {
            return parsedValue;
        }
    }
    return null;
}

// function for adding and subtracting the data
function handleAddOrSubRequest(req, res, parsedUrl, query) {
    const type = query.type;
    const value = validateAndParseInt(query.value);
    let dateParam;


    if (value === null) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: 'Invalid value. Value must be a positive integer from 0 to 99999 only.' }));
        return;
    } else if (!query.type || !query.value) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: 'Both type and value parameters are required.' }));
        return;
    }
    else if (query.date) {
        try {
            dateParam = parseDate(query.date);
        } catch (error) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: error.message }));
            return;
        }
    } else {
        dateParam = new Date();
    }

    if (type === 'days') {
        const newDate = parsedUrl.pathname === '/add' ? addDays(dateParam, value) : subDays(dateParam, value);
        res.end(JSON.stringify({ date: format(newDate, 'dd-MMM-yyyy') }));
    } else if (type === 'weeks') {
        const newDate = parsedUrl.pathname === '/add' ? addDays(dateParam, 7 * value) : subDays(dateParam, 7 * value);
        res.end(JSON.stringify({ date: format(newDate, 'dd-MMM-yyyy') }));
    } else {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: 'Invalid type parameter. Use days or weeks' }));
    }
}

// function for serving static files
function serveStaticFile(res, filePath, contentType) {
    const stream = fs.createReadStream(filePath);

    stream.on('error', (err) => {
        if (err.code === 'ENOENT') {
            res.statusCode = 404;
            res.end('Not Found');
        } else {
            res.statusCode = 500;
            res.end('Internal Server Error');
        }
    });

    res.setHeader('Content-Type', contentType);
    stream.pipe(res);
}

// function for handling cases where path is wrong
function handleNotFoundRequest(res) {
    res.statusCode = 404;
    res.end(JSON.stringify({ error: 'Not Found. Use path add or sub' }));
}

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url);
    const query = querystring.parse(parsedUrl.query);
    const pathname = parsedUrl.pathname;


    res.setHeader('Content-Type', 'application/json');
    const folderName = 'static'
    if (pathname === '/logo.jpg') {
        const imagePath = path.join(__dirname, folderName, 'calendar.png');
        serveStaticFile(res, imagePath, 'image/png');
    } else if (pathname === '/favicon.ico') {
        const faviconPath = path.join(__dirname, folderName, 'favicon.ico');
        serveStaticFile(res, faviconPath, 'image/x-icon');
    }else if (pathname === '/add' || pathname === '/sub') {
        handleAddOrSubRequest(req, res, parsedUrl, query);
    } else if (pathname === '/') {
        const htmlPath = path.join(__dirname, folderName, 'index.html');
        serveStaticFile(res, htmlPath, 'text/html');
    } else {
        handleNotFoundRequest(res);
    }
});

// use env variable or default port 3000
const port = process.env.PORT || 3000;
server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
