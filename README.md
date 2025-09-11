## Pixels Server
Image processing and caching microservice built on Bun and Hono. 
It reads source images from configured storage backends (S3, FTP, SFTP, LOCAL), 
applies on-the-fly transformations and returns the processed image. 
Mostly suitable for batch operations on demand.

- Runtime: Bun
- Framework: Hono
- Image processing: Sharp
- Cache/progress store: Redis (via ioredis)
- Storage backends: S3 (full support), FTP/SFTP/LOCAL (future)

---

#### Features
- On-the-fly image transforms via query parameters
- Deterministic naming for processed images (cache-friendly)
- Storage abstraction layer with S3 (now), FTP, SFTP, LOCAL (future) managers
- Batch processing from a directory or an explicit list
- Batch progress tracking via Redis with token-based polling
- Structured error handling with unified JSON responses
- Health/ping routes for readiness checks

---

#### On-Demand Considerations
- On-demand transformation are not ideal if
  - Using remote storage like S3/FTP/SFTP as each fetch takes a lot of time
  - You don't get any CDN support that you might get with S3 & compatible storage solutions
- Though it is great if
  - Using LOCAL storage backend (future)
  - Small app/website that don't heavily rely on lot of users
  - CDN support is not very useful for your small use-case
    - or you have your own CDN handling
---



#### Requirements
- Bun 1.x
- Node-compatible environment (for sharp and dependencies)
- Redis reachable via `REDIS_URL`
- At least one storage configured in `config.json`
- For S3: valid access to bucket and endpoint

---

#### Installation
```bash
bun install
```

---

#### Configuration
The server expects a `config.json` at the repository root. Example (S3):
```json
{
  "storage": {
    "s3_main": {
      "type": "s3",
      "s3": {
        "bucket": "my-bucket",
        "endpoint": "https://s3.my-cloud.example",
        "accessKey": "AKIA...",
        "secretKey": "...",
        "prefix": "images/",           
        "region": "us-east-1",
        "convertPath": "converted/",  
        "acl": "public-read"
      }
    }
  }
}
```
Notes:
- `s3_main`: is basically a unique name of your storage
  - You can have as many storage backends as you wish (even multiple of the same type even)
- `prefix`: where original images reside (e.g., `images/`)
- `convertPath` (optional): where processed images will be stored (e.g., `converted/`). 
  - When present and reading processed images, the service will look under this path. 
  - For originals, it uses `prefix`.
  - **(RECOMMENDED)** to use convertPath as it doesn't mess with the original dir
- S3 credentials are supplied in the S3 block; ACL is required.


Environment variable:
- `REDIS_URL` (required) – e.g. `redis://localhost:6379`

Create a `.env` (if you use one) and export before running, or set in your process manager:
```bash
export REDIS_URL="redis://localhost:6379"
```

---

#### Running
Development:
```bash
bun --hot src/index.ts
```
Default port is `4141` (from `src/index.ts`).

Health check:
```bash
curl -s http://localhost:4141/health | jq
```

---

#### API
Base URL: `http://localhost:4141`
> Also attached the openapi.yaml file which you can copy/paste it on [Swagger Editor](https://editor.swagger.io/) for the GUI view

- Health
    - `GET /` or `/ping` or `/health`
        - Response: `{ success: true, message: "router is working", version: "..." }`

- Image processing
    - `GET /images/:storage/public/:imagePath{.+}`
        - `:storage`: key from `config.json` (e.g., `s3_main`)
        - `:imagePath`: full path including filename and extension relative to storage prefix (e.g., `products/p1.jpg`)
        - Query parameters (validated):
            - `width` (number)
            - `height` (number)
            - `quality` (0–100)
            - `blur` (>= 0)
            - `rotate` (>= 0)
            - `greyscale` (true/false or 1/0)
            - `flip` (true/false or 1/0)
            - `flop` (true/false or 1/0)
            - `tint` (hex color string, e.g., `#FF0000`)
            - `format` (one of: jpg, jpeg, png, webp, gif, tiff, avif, heif, jp2, jxl, raw)
        - Returns: the processed image buffer with proper `Content-Type`
        - Example:
          ```bash
          curl -L \
            "http://localhost:4141/images/s3_main/public/products/p1.jpg?width=600&height=600&format=webp&quality=80"
          ```

- Batch processing
    - `POST /batch/process/directory`
        - Body JSON: `{ "storageName": "s3_main", "path": "products/", "transformations": { "width": 800, "format": "webp" } }`
        - Starts background batch; returns `{ success, message, token }`
    - `POST /batch/process/list`
        - Body JSON: `{ "storageName": "s3_main", "filePaths": ["products/p1.jpg", "products/p2.jpg"], "transformations": { "width": 800 } }`
        - Returns `{ success, message, token }`
    - `GET /batch/progress/:token`
        - Returns `{ success: true, progress: { done, pending, errors: [...] } }`

- Configuration utility
    - `GET /config/storage/validate/:storageName`
        - For S3 backends, checks credentials by attempting a list operation.
        - Returns `{ success: true, message: "Credentials for 'name' are valid" }` on success.

---

#### Deterministic Filenames for Processed Images
To ensure cacheability and avoid reprocessing, 
processed images are saved under `convertPath` (if configured) using deterministic filenames 
derived from the base name and sorted transformation parameters.

Example naming rule (`functions.createNameFromParams`):
- Original: `p1.jpg`
- Query: `?width=600&height=800&format=webp`
- Processed name: `p1-h-800-w-600.webp`

On subsequent requests with the same parameters, the service will attempt to read the already-processed file directly.

---

#### Storage Backends
- `S3`: Full support for upload/read/list/credentials check.
- `FTP/SFTP/LOCAL`: **upcoming**

---

#### Error Handling
- Custom `ErrorObject` ensures consistent JSON:
  ```json
  { "success": false, "error": "Message" }
  ```
- Middleware catches and formats unexpected errors to 500.

Common error cases:
- 400: Missing/invalid query parameters, unsupported extension/format, missing file extension.
- 401: Invalid S3 credentials (mapped specific S3 errors).
- 404: Image not found in storage.
- 500/502: Storage or sharp processing issues.

---

#### Deployment Notes
- Ensure `REDIS_URL` is set.
- Provide `config.json` with valid storage configuration.
- For S3: verify bucket, endpoint, region, credentials, and network access.
- Expose port `PORT`/4141 (or adjust your reverse proxy).

Example Docker snippet (conceptual):
```dockerfile
FROM oven/bun:1 as base
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile
COPY . .
ENV REDIS_URL=redis://redis:6379
EXPOSE 4141
CMD ["bun", "src/index.ts"]
```

---

#### Troubleshooting
- Config file not found or invalid
    - The app reads `config.json` from the repo root and validates it with zod. Check logs for detailed path/type errors.
- Redis connection issues
    - Ensure `REDIS_URL` is reachable; the app waits until `DbRedis.status()` becomes `ready`.
- S3 access denied
    - Verify credentials, endpoint, region, and bucket policy; use `/config/storage/validate/:storageName` to check.
- Processed image isn't returned
    - Confirm you provided at least one valid transformation query parameter; otherwise a 400 is returned.

---

#### Upcoming Features
- LOCAL storage backend
- DOCKER support (with docker-compose)
- Custom headers to return with image
  - including Cache-Control headers
- Caching to LOCAL storage (via any backend) for quick image return
- Direct upload/delete image to your storage backend (with admin-token)
- More image transformation operations
- Basic logging support

#### License
```
MIT License

Copyright (c) 2025 CODEVRY LABS (SAKSHAM KHURANA)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

