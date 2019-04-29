
MOCHA=./node_modules/.bin/mocha
ISTANBUL=./node_modules/.bin/nyc

all:

test:
	$(MOCHA)

coverage:
	$(ISTANBUL) --reporter=html $(MOCHA)

clean:
	rm -rf coverage

.PHONY: test clean
