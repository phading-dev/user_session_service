import { writeFileSync } from "fs";
import "./environment";

function main() {
  let env = process.argv[2];
  let turnupTemplate = `#!/bin/bash
# GCP auth
gcloud auth application-default login
gcloud config set project ${globalThis.PROJECT_ID}

# Create service account
gcloud iam service-accounts create ${globalThis.BUILDER_ACCOUNT}

# Grant permissions to the service account
gcloud projects add-iam-policy-binding ${globalThis.PROJECT_ID} --member="serviceAccount:${globalThis.BUILDER_ACCOUNT}@${globalThis.PROJECT_ID}.iam.gserviceaccount.com" --role='roles/cloudbuild.builds.builder' --condition=None
gcloud projects add-iam-policy-binding ${globalThis.PROJECT_ID} --member="serviceAccount:${globalThis.BUILDER_ACCOUNT}@${globalThis.PROJECT_ID}.iam.gserviceaccount.com" --role='roles/container.developer' --condition=None
gcloud projects add-iam-policy-binding ${globalThis.PROJECT_ID} --member="serviceAccount:${globalThis.BUILDER_ACCOUNT}@${globalThis.PROJECT_ID}.iam.gserviceaccount.com" --role='roles/spanner.databaseAdmin' --condition=None

# Set k8s cluster
gcloud container clusters get-credentials ${globalThis.CLUSTER_NAME} --location=${globalThis.CLUSTER_REGION}

# Create the service account
kubectl create serviceaccount ${globalThis.SERVICE_ACCOUNT} --namespace default

# Grant database permissions to the service account
gcloud projects add-iam-policy-binding ${globalThis.PROJECT_ID} --member=principal://iam.googleapis.com/projects/${globalThis.PROJECT_NUMBER}/locations/global/workloadIdentityPools/${globalThis.PROJECT_ID}.svc.id.goog/subject/ns/default/sa/${globalThis.SERVICE_ACCOUNT} --role=roles/spanner.databaseUser --condition=None
gcloud projects add-iam-policy-binding ${globalThis.PROJECT_ID} --member=principal://iam.googleapis.com/projects/${globalThis.PROJECT_NUMBER}/locations/global/workloadIdentityPools/${globalThis.PROJECT_ID}.svc.id.goog/subject/ns/default/sa/${globalThis.SERVICE_ACCOUNT} --role=roles/spanner.databaseUser --condition=None

# Create Spanner database
gcloud spanner databases create ${globalThis.DATABASE_ID} --instance=${globalThis.DATABASE_INSTANCE_ID}
`;
  writeFileSync(`turnup_${env}.sh`, turnupTemplate);

  let cloudbuildTemplate = `steps:
- name: 'node:20.12.1'
  entrypoint: 'npm'
  args: ['install']
- name: 'node:20.12.1'
  entrypoint: 'npx'
  args: ['spanage', 'update', 'db/ddl', '-p', '${globalThis.PROJECT_ID}', '-i', '${globalThis.DATABASE_INSTANCE_ID}', '-d', '${globalThis.DATABASE_ID}']
- name: node:20.12.1
  entrypoint: npx
  args: ['bundage', 'bfn', 'main', 'main_bin', '-e', 'environment_${env}', '-t', 'bin']
- name: 'gcr.io/cloud-builders/docker'
  args: ['build', '-t', 'gcr.io/${globalThis.PROJECT_ID}/${globalThis.SERVICE_NAME}:latest', '-f', 'Dockerfile_${env}', '.']
- name: "gcr.io/cloud-builders/docker"
  args: ['push', 'gcr.io/${globalThis.PROJECT_ID}/${globalThis.SERVICE_NAME}:latest']
- name: 'gcr.io/cloud-builders/kubectl'
  args: ['apply', '-f', 'service_${env}.yaml']
  env:
    - 'CLOUDSDK_CONTAINER_CLUSTER=${globalThis.CLUSTER_NAME}'
    - 'CLOUDSDK_COMPUTE_REGION=${globalThis.CLUSTER_REGION}'
- name: 'gcr.io/cloud-builders/kubectl'
  args: ['rollout', 'restart', 'deployment', '${globalThis.SERVICE_NAME}-deployment']
  env:
    - 'CLOUDSDK_CONTAINER_CLUSTER=${globalThis.CLUSTER_NAME}'
    - 'CLOUDSDK_COMPUTE_REGION=${globalThis.CLUSTER_REGION}'
options:
  logging: CLOUD_LOGGING_ONLY
`;
  writeFileSync(`cloudbuild_${env}.yaml`, cloudbuildTemplate);

  let dockerTemplate = `FROM node:20.12.1

WORKDIR /app
COPY package.json .
COPY package-lock.json .
COPY bin/ .
RUN npm install --production

EXPOSE ${globalThis.PORT}
CMD ["node", "main_bin"]
`;
  writeFileSync(`Dockerfile_${env}`, dockerTemplate);

  let serviceTemplate = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${globalThis.SERVICE_NAME}-deployment
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ${globalThis.SERVICE_NAME}-pod
  template:
    metadata:
      labels:
        app: ${globalThis.SERVICE_NAME}-pod
    spec:
      serviceAccountName: ${globalThis.SERVICE_ACCOUNT}
      containers:
      - name: ${globalThis.SERVICE_NAME}-container
        image: gcr.io/phading-dev/${globalThis.SERVICE_NAME}:latest
        ports:
        - containerPort: ${globalThis.PORT}
---
apiVersion: monitoring.googleapis.com/v1
kind: PodMonitoring
metadata:
  name: ${globalThis.SERVICE_NAME}-monitoring
spec:
  selector:
    matchLabels:
      app: ${globalThis.SERVICE_NAME}-pod
  endpoints:
  - port: ${globalThis.PORT}
    path: /metricsz
    interval: 30s
---
apiVersion: cloud.google.com/v1
kind: BackendConfig
metadata:
  name: ${globalThis.SERVICE_NAME}-neg-health-check
spec:
  healthCheck:
    port: ${globalThis.PORT}
    type: HTTP
    requestPath: /healthz
---
apiVersion: v1
kind: Service
metadata:
  name: ${globalThis.SERVICE_NAME}
  annotations:
    cloud.google.com/neg: '{"ingress": true}'
    beta.cloud.google.com/backend-config: '{"default": "${globalThis.SERVICE_NAME}-neg-health-check"}'
spec:
  selector:
    app: ${globalThis.SERVICE_NAME}-pod
  ports:
    - protocol: TCP
      port: 80
      targetPort: ${globalThis.PORT}
  type: ClusterIP
`;
  writeFileSync(`service_${env}.yaml`, serviceTemplate);
}

main();
