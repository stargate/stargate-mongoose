#!/bin/sh

# Default to INFO as root log level
LOGLEVEL=INFO
REQUESTLOG=false

# Default to images used in project integration tests
DSETAG="6.8.32"
SGTAG="v2.0.8"
JSONTAG="v1.0.0-ALPHA-1"

while getopts "qr:t:" opt; do
  case $opt in
    q)
      REQUESTLOG=true
      ;;
    r)
      LOGLEVEL=$OPTARG
      ;;
    t)
      SGTAG=$OPTARG
      ;;
    \?)
      echo "Valid options:"
      echo "  -t <tag> - use Docker images tagged with specified Stargate version (will pull images from Docker Hub if needed)"
      echo "  -q - enable request logging for APIs in 'io.quarkus.http.access-log' (default: disabled)"
      echo "  -r - specify root log level for APIs (defaults to INFO); usually DEBUG, WARN or ERROR"
      exit 1
      ;;
  esac
done

export LOGLEVEL
export REQUESTLOG
export DSETAG
export SGTAG
export JSONTAG

echo "Running with DSE $DSETAG, Stargate $SGTAG, JSON API $JSONTAG"

docker-compose -f bin/docker-compose.yml --verbose up -d
