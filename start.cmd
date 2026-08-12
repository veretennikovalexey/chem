@echo off
rem Start the periodic table server -> http://localhost:1429/index.html
rem The server resolves data\ and public\ relative to itself, so it does not
rem matter which folder this is run from.
node "%~dp0server\server.js"
