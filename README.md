# Yelp Camp

Yelp Camp website.

## Installation

```sh
npm install
```

## Development

Application use environment variables for Mongo DB connection string, Mailgun API key, domain and secret code needed to be able to register as an administrator user.

To create local environment variables in PowerShell, simply use:
```sh
$env:DB_CONNECTION_STRING = 'mongodb://localhost/yelpCamp'
$env:MG_API_KEY = 'example-api-key'
$env:MG_DOMAIN = 'example-domain'
$env:ADMIN_CODE = 'example-code'
```

Run application in development mode:
```sh
npm run develop
```
