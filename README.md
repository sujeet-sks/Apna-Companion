# Apna Companion

Apna Companion helps organizations arrange in-person assistance for customers. Organizations assign companions to bookings, and companions track and update their assigned visits.

## Local setup guide

### 1. Install the required tools

Install Git Python 3.13, and Node.js 22.22.3 or later within the Node.js 22 release line. Node.js includes npm. The commands below use Git Bash on Windows. Install VS Code if you want to open the project with `code .`.

Open Git Bash and check your tools.

```sh
git --version
python --version
node --version
npm --version
```

If you plan to commit changes, set your Git name and email. Replace both placeholders with your own details.

```sh
git config --global user.name "YOUR_NAME"
git config --global user.email "YOUR_EMAIL"
```

### 2. Clone the repository

```sh
git clone https://github.com/sujeet-sks/Apna-Companion.git
cd Apna-Companion
git branch -a
```

To run the project as it is, stay on the default branch. If you have an existing remote feature branch, replace `YOUR_BRANCH` with your branch name and merge the latest `main` into it.

```sh
git switch --track origin/feature/YOUR_BRANCH
git merge origin/main
git status -sb
```

If you are starting a new feature branch, run `git switch -c feature/YOUR_BRANCH origin/main` instead. Open the repository in VS Code.

```sh
code .
```

### 3. Set up and run Django

In the first terminal, start at the repository root. Create and activate the virtual environment, then install the Python dependencies.

```sh
cd backend
python -m venv .venv
source .venv/Scripts/activate
python -m pip install -r requirements.txt
```

On macOS or Linux, use `python3.13 -m venv .venv` to create the environment and `source .venv/bin/activate` each time you activate it.

Ask a project maintainer for the connection URL for the team's Neon development database. The guide uses that database, so there is no separate data download or import.

Generate a Django secret key for your local setup.

```sh
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

From inside `backend/`, open the environment file in Notepad, or create it in your editor. If Notepad asks whether to create the file, choose **Yes**.

```sh
notepad.exe .env
```

Save the file as `backend/.env`, beside `manage.py`. Replace the placeholders with the full Neon URL from the maintainer and the key you generated. Keep the database URL's connection options intact and keep this file out of Git.

```dotenv
DATABASE_URL=YOUR_NEON_DEVELOPMENT_DATABASE_URL
DJANGO_SECRET_KEY='YOUR_GENERATED_DJANGO_SECRET_KEY'
```

In the same terminal, check Django, verify the database connection, and start the server.

```sh
python manage.py check
python manage.py shell -c "from django.db import connection; connection.ensure_connection(); print(connection.vendor)"
python manage.py runserver
```

The database check should print `postgresql`. Leave the server running and open [the API health endpoint](http://127.0.0.1:8000/api/health/). It should return `{"status":"ok"}`.

### 4. Set up and run Angular

Open a second terminal at the repository root. Install the locked dependencies and start the Customer app.

```sh
cd frontend/multi-frontend-workspace
npm ci
npx ng serve app-customer --port 4200
```

Keep the terminal open and visit [http://localhost:4200](http://localhost:4200). To run another app, open a separate terminal in `frontend/multi-frontend-workspace/` and use its command below. The Customer and Admin apps currently display starter screens.

| Interface | Command | Address |
| --- | --- | --- |
| Customer | `npx ng serve app-customer --port 4200` | [http://localhost:4200](http://localhost:4200) |
| Admin | `npx ng serve app-admin --port 4201` | [http://localhost:4201](http://localhost:4201) |
| Organization | `npx ng serve app-org --port 4202` | [http://localhost:4202](http://localhost:4202) |
| Companion | `npx ng serve app-companion --port 4203` | [http://localhost:4203](http://localhost:4203) |

### 5. Run the project on later days

Reopen the existing clone in VS Code and reuse `backend/.venv` and `backend/.env`. If you are working on a feature branch already on GitHub, review any local changes and update it from the repository root.

```sh
git status --short
git fetch origin
git switch feature/YOUR_BRANCH
git pull --ff-only origin feature/YOUR_BRANCH
git merge origin/main
```

If you are using `main`, update it with `git pull --ff-only origin main` while on that branch.

Start Django in one terminal.

```sh
cd backend
source .venv/Scripts/activate
python manage.py runserver
```

Start Angular in another terminal. Use the command for the app you want from the table above.

```sh
cd frontend/multi-frontend-workspace
npx ng serve app-customer --port 4200
```

Activate the virtual environment in every new Django terminal. Angular runs independently of it. Run `python -m pip install -r requirements.txt` from `backend/` when Python requirements change, and run `npm ci` from the Angular workspace when the lockfile changes.

### 6. Commit and push your changes

If you are contributing, run these commands from the repository root on your own feature branch. Replace the example file path, commit message, and branch name.

```sh
git status --short
git add path/to/changed/file
git commit -m "Describe the change"
git push -u origin feature/YOUR_BRANCH
```
