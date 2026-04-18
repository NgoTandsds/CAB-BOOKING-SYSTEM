# Kubernetes Deployment — CAB Booking System

## Prerequisites
- kubectl configured against a cluster (minikube, kind, or cloud)
- Docker images built and pushed/loaded

## Build Images (local)
```bash
# Build all images with docker compose
docker compose build

# Tag for k8s (if using minikube)
eval $(minikube docker-env)
docker compose build
```

## Deploy

### 1. Create namespace + config
```bash
kubectl apply -f infra/k8s/namespace.yaml
kubectl apply -f infra/k8s/configmap.yaml
```

### 2. Deploy all microservices
```bash
kubectl apply -f infra/k8s/api-gateway.yaml
kubectl apply -f infra/k8s/microservices.yaml
```

### 3. Verify deployments
```bash
kubectl get pods -n cab-booking
kubectl get services -n cab-booking
kubectl get hpa -n cab-booking
```

### 4. Check health
```bash
# Port-forward api-gateway
kubectl port-forward svc/api-gateway 3000:3000 -n cab-booking

# Test
curl http://localhost:3000/health
```

## Rolling Update (TC 106 — Zero Downtime)
```bash
# Update image and apply rolling update
kubectl set image deployment/booking-service \
  booking-service=cab-booking/booking-service:v2 \
  -n cab-booking

# Watch rollout
kubectl rollout status deployment/booking-service -n cab-booking
```

## Rollback (TC 110)
```bash
kubectl rollout undo deployment/booking-service -n cab-booking
kubectl rollout history deployment/booking-service -n cab-booking
```

## HPA Scaling (TC 107)
```bash
# View HPA status
kubectl get hpa -n cab-booking

# Describe HPA (shows current metrics)
kubectl describe hpa booking-service-hpa -n cab-booking
```

## Service Ports
| Service | Internal Port | K8s Service |
|---------|-------------|-------------|
| api-gateway | 3000 | LoadBalancer |
| auth-service | 3001 | ClusterIP |
| user-service | 3002 | ClusterIP |
| driver-service | 3003 | ClusterIP |
| booking-service | 3004 | ClusterIP |
| ride-service | 3005 | ClusterIP |
| payment-service | 3006 | ClusterIP |
| pricing-service | 3007 | ClusterIP |
| notification-service | 3008 | ClusterIP |
| review-service | 3009 | ClusterIP |
