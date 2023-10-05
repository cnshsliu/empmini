export http_proxy=http://127.0.0.1:7890
export https_proxy=http://127.0.0.1:7890
export MONGODB_URI=mongodb://127.0.0.1:27017/emp;
export EMP_MINI_ADDR="0.0.0.0";
export EMP_MINI_PORT=6008;
export EMPMINI_HOME="$HOME/dev/empmini";
export NODE_TLS_REJECT_UNAUTHORIZED=0;
export NODE_EXTRA_CA_CERTS=~/Library/Application\ Support/Caddy/pki/authorities/local/root.crt
node build/index.js
