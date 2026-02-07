module.exports = {
  apps : [{
    name: "meilisearch",
    script: "docker",
    args: "run -d -p 7700:7700 --restart unless-stopped getmeili/meilisearch:latest",
    interpreter: "none"
  }]
};
