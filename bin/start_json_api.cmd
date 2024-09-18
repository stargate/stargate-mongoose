
@echo off  
set LOGLEVEL=INFO
set REQUESTLOG=false
set SCRIPTS_HOME=%~dp0
For /F "tokens=1* delims==" %%A IN (%SCRIPTS_HOME%\..\api-compatibility.versions) DO (
    IF "%%A"=="stargate_version" set SGTAG=%%B
    IF "%%A"=="data_api_version" set DATAAPITAG=%%B
    )
@echo on
echo "Running with Stargate %SGTAG%, Data API %DATAAPITAG%"
@echo off
docker-compose -f %SCRIPTS_HOME%\docker-compose.yml up -d
