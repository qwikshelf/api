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

## 3. Clone the Codebase
Once inside the EC2 instance:
```bash
git clone <your-repository-url>
cd qwikshelf-ws/api
```

## 4. Configure Production Environment
You need to create the `.env` file on the server. Use the [deploy/.env](file:///Users/oscarmild/Documents/workspack/qwikshelf-ws/api/deploy/.env) as a template.

```bash
nano deploy/.env
```
**Required production changes:**
- `DB_HOST=db` (keeps traffic inside the Docker network)
- `APP_ENV=production`
- `ALLOWED_ORIGINS=http://<YOUR_DOMAIN_OR_IP>`
- `JWT_SECRET=your-long-secure-random-string`

## 5. Launch the Stack
Run the Docker Compose command:
```bash
# Ensure you are in the directory containing the docker-compose.yml
cd deploy
docker-compose up -d --build
```

---

## Post-Deployment Checklist

### 1. Verify Containers
```bash
docker ps
```
You should see 4 containers: `qwikshelf-api`, `qwikshelf-ui`, `qwikshelf-db`, and `qwikshelf-adminer`.

### 2. Check API Health
Visit `http://<INSTANCE_PUBLIC_IP>:8080/health` in your local browser.

### 3. Access Adminer
Visit `http://<INSTANCE_PUBLIC_IP>:8081` (restricted to your `AllowedIP`).
- **Server**: `db`
- **Username**: (your `.env` POSTGRES_USER)
- **Password**: (your `.env` POSTGRES_PASSWORD)

### 4. Backups
If you want to use the S3 backup feature, ensure you create an S3 bucket named `qwikshelf-backups-<your-account-id>` in the same region.
