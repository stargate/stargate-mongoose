docker run --name stargate \
  -p 8080:8080 -p 8081:8081 \
  -p 8082:8082 -p 127.0.0.1:9042:9042 \
  -e CLUSTER_NAME=stargate \
  -e CLUSTER_VERSION=4.0 \
  -e DEVELOPER_MODE=true \
  stargateio/stargate-4_0:v1.0.65
