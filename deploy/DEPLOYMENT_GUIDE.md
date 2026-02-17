# Deployment Guide: QwikShelf to AWS

Now that your infrastructure is created via CloudFormation, follow these steps to deploy your application logic.

## 1. Prepare your EC2 KeyPair
Before deploying the stack, you must have an existing EC2 KeyPair in the region you are deploying to.

1. Go to the **EC2 Console** -> **Network & Security** -> **Key Pairs**.
2. Click **Create key pair**.
3. Name it (e.g., `qwikshelf-prod`).
4. Select **RSA** and **.pem**.
5. Click **Create key pair**. The `.pem` file will download automatically.
6. **Important**: Move this file to your project directory and set permissions: `chmod 400 your-key.pem`.

## 2. Deploy the Stack
When you upload the [`cloudformation.yaml`](file:///Users/oscarmild/Documents/workspack/qwikshelf-ws/api/deploy/cloudformation.yaml) file to AWS, you will see a parameter called **`KeyName`**. 

- Use the exact name of the KeyPair you just created (e.g., `qwikshelf-prod`).
- Provide your **`AllowedIP`** (your local public IP followed by `/32`).

## 3. Connect to the Server
Use the `SSHCommand` from your CloudFormation **Outputs** tab:
```bash
ssh -i "your-key.pem" ubuntu@<INSTANCE_PUBLIC_IP>
```

## 4. Clone and Launch
Inside the EC2 instance:
```bash
git clone <your-repository-url>
cd qwikshelf-ws/api/deploy

# Create your .env file
nano .env

# Start the stack
docker-compose up -d --build
```

---

## 5. SSL & HTTPS Setup (Nginx Proxy Manager)

This stack uses **Nginx Proxy Manager (NPM)** to handle free Let's Encrypt SSL certificates.

1.  **Access NPM Admin**: Visit `http://<INSTANCE_PUBLIC_IP>:81` (restricted to your `AllowedIP`).
2.  **Login**:
    - **Email**: `admin@example.com`
    - **Password**: `changeme`
    - *(You will be prompted to update these immediately)*.
3.  **Add Frontend (UI) Proxy**:
    - Click **Proxy Hosts** -> **Add Proxy Host**.
    - **Domain Names**: `yourdomain.com`
    - **Forward Hostname**: `ui`
    - **Forward Port**: `80`
    - **SSL Tab**: Select **Request a new SSL Certificate**, Agree to TOS, and enable **Force SSL**.
4.  **Add Backend (API) Proxy**:
    - Click **Proxy Hosts** -> **Add Proxy Host**.
    - **Domain Names**: `api.yourdomain.com` (or use a path like `yourdomain.com/api`)
    - **Forward Hostname**: `api`
    - **Forward Port**: `8080`
    - **SSL Tab**: Same as above.

---

## Post-Deployment Checklist

### 1. Verify Containers
```bash
docker ps
```
You should see: `qwikshelf-proxy`, `qwikshelf-api`, `qwikshelf-ui`, `qwikshelf-db`, and `qwikshelf-adminer`.

### 2. Check Adminer
Visit `http://<INSTANCE_PUBLIC_IP>:81` (It is recommended to proxy Adminer through NPM as well if you need it accessible over HTTPS).
