MOCHA = ./node_modules/.bin/mocha
INSTALL_TEST = NODE_ENV=test npm install

init: install test

install:
	@npm install

test:
	@$(INSTALL_TEST)
	@$(MOCHA) ./test --coverage

.PHONY: instal test
