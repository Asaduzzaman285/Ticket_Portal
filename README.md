
## Tools

### Built With


| Build With       | Version  |
| ---------------- | -------- |
| node             | v22.17.1 |
| npm              | 10.9.2   |
| react            | 18.3.1   |
| axios            | 1.7.9    |
| bootstrap        | 5.3.3    |
| react-dom        | 18.3.1   |
| react-redux      |          |
| react-router-dom | 7.1.1    |
| redux            |          |





### Docker
#### Docker: Resources
- https://www.howtoforge.com/dockerizing-laravel-with-nginx-mysql-and-docker-compose/



```

sudo docker-compose up -d

=====see all images ========
sudo docker images

=========see all containers ========
sudo docker ps -a
```

```
sudo docker-compose up --build

sudo docker-compose up -d

sudo docker-compose up -d --build

sudo docker-compose down
sudo docker-compose build && docker-compose up -d

 sudo chmod 777 -R ./*
 sudo chmod 777 -R ./docker

sudo docker-compose down
```

```
docker images
docker ps -a
docker container prune
docker stop all containers
cd eppa/api
exit
```

Docker  container : wsms-react-nginx-container
```
docker ps -a
docker exec  -it 401f11954d06 sh
php -m
```



**Docker Build and check Flow & Steps to Follow**
```
docker-compose down
sudo docker-compose down --rmi all --remove-orphans && docker-compose build && docker-compose up --force-recreate
sudo docker-compose down && docker-compose build && docker-compose up --force-recreate -d
sudo docker-compose build && docker-compose up -d
sudo docker-compose build --no-cache && docker-compose up -d
docker exec  -it wsms-frontend-container sh
docker exec  -it wsms-nginx-container sh
ls -l -a
composer -v
cd vendor/symfony/string/Resources
vim functions.php
at line 33 

cd /
cd usr/local/etc/php/conf.d/
ls -l -a
exit
docker-compose exec php composer suggest
docker-compose exec php rm -rf vendor composer.lock
docker-compose exec php composer install --ignore-platform-reqs
docker-compose exec php composer install --no-cache --ignore-platform-reqs
docker-compose exec php composer install --optimize-autoloader --dev
docker-compose exec php php -v

```


```
docker-compose exec php  rm -rf bootstrap/cache/*.php
docker-compose exec php  php artisan key:generate
docker-compose exec php  php artisan passport:install --force
docker-compose exec php  php artisan passport:keys
```

containers related commands are:
```
**docker stop all containers**
docker kill $(docker ps -q)
docker system prune
docker system prune -a
docker ps -a
docker image ls
docker volume ls
docker network ls
```

```
docker build -t react-nginx .
docker run --rm -it -p 8080:80 react-nginx
http://localhost:8080
```

```
docker build -t wsms-react-image .
sudo docker run --rm --name wsms-react-container -d -p 3000:3000 -v $(pwd):/app  wsms-react-image
localhost:801
```
**Testing**
```
docker build -t wsms-react-app .

docker run -p 3000:3000 wsms-react-app
or
sudo docker run --rm --name wsms-react-container -d -p 3000:3000   wsms-react-app

http://localhost:3000
```

**Finally Worked**
```
docker-compose down
sudo docker-compose build && docker-compose up
http://localhost:801
```

#### Browser: 
- host: localhost
- WSMS Frontend: http://localhost:801
- WSMS API: http://localhost:81
- phpmyadmin: http://localhost:8444
  - user:pass = wap:wap
- API: http://localhost:81
- Log Viewer: http://localhost:81/log_cmp_2023-04-09 (today date yyyy-mm-dd)



```
docker stop wsms-react-container
docker rm wsms-react-container
```


## GIT commit types
```
feat: New feature for the user.
fix: Bug fix.
style: Code Style Changes.
refactor: Code Refactoring.
build: Build System Changes.
ci: Continuous Integration Changes.
perf: Performance Improvements.
revert: Revert a Previous Commit.
docs: Documentation changes.
test: Adding or modifying tests.
chore: Routine tasks, maintenance, or housekeeping.
```

