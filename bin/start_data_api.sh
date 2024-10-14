#!/bin/sh

# Default to INFO as root log level
SCRIPTS_HOME=$(dirname $0)
LOGLEVEL=INFO
REQUESTLOG=false

#load the versions from the file
VERSIONS_FILE=$SCRIPTS_HOME/../api-compatibility.versions

if [ -f $VERSIONS_FILE ]
then
  echo "Loading versions from $VERSIONS_FILE"
  . $VERSIONS_FILE
fi

SGTAG=$stargate_version
DATAAPITAG=$data_api_version


while getopts "qr:t:j:" opt; do
  case $opt in
    q)
      REQUESTLOG=true
      ;;
    r)
      LOGLEVEL=$OPTARG
      ;;
    t)
      SGTAG=$OPTARG
      echo "Using Stargate version $SGTAG"
      ;;
    j)
      DATAAPITAG=$OPTARG
      echo "Using Data API version $DATAAPITAG"
      ;;
    \?)
      echo "Valid options:"
      echo "  -t <tag> - use Docker images tagged with specified Stargate version (will pull images from Docker Hub if needed)"
      echo "  -j <tag> - use Docker images tagged with specified Data API version (will pull images from Docker Hub if needed)"
      echo "  -q - enable request logging for APIs in 'io.quarkus.http.access-log' (default: disabled)"
      echo "  -r - specify root log level for APIs (defaults to INFO); usually DEBUG, WARN or ERROR"
      exit 1
      ;;
  esac
done

if [ -z "$SGTAG" ]
then
  echo "Missing Stargate version (option -t). For example -t v2.0.8"
  exit 1
fi

if [ -z "$DATAAPITAG" ]
then
  echo "Missing Data API version (option -j). For example -j v1.0.0-ALPHA-1"
  exit 1
fi

export LOGLEVEL
export REQUESTLOG
export SGTAG
export DATAAPITAG

echo "Running with Stargate $SGTAG, Data API $DATAAPITAG"

if which docker-compose
then
  docker-compose -f $SCRIPTS_HOME/docker-compose.yml up -d
else
  docker compose -f $SCRIPTS_HOME/docker-compose.yml up -d
fi
