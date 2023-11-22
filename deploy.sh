/var/www/html/db/createBackupDb.sh

git pull origin master
cp -R dist dist1
npm run build production
forever restart dist/main.js
cp dist1/com.os.fruitmasterproToken.json dist
cp dist1/com.os.fruitmasterproClient.json dist
cp dist1/crawlToken.json dist
cp dist1/crawlClient.json dist
cp dist1/gmailToken.json dist
cp dist1/gmailClient.json dist
cp dist1/com.amanotes.gs.g06.json dist
cp dist1/com.os.fruitmasterpro.json dist
cp dist1/1658687701.json dist
rm -rf dist1