@echo off

pushd "%~dp0"

mkdir Backup

node app.js

cmd /k