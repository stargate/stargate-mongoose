
@echo off  
set LOGLEVEL=INFO
set REQUESTLOG=false
For /F "tokens=1* delims==" %%A IN (api-compatibility.versions) DO (
    IF "%%A"=="stargate_version" set SGTAG=%%B
    IF "%%A"=="json_api_version" set JSONTAG=%%B
    )
@echo on
echo "Running with Stargate %SGTAG%, JSON API %JSONTAG%"
@echo off
docker-compose -f bin/docker-compose.yml up -d