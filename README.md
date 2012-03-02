# ZAVOD (zavód)

![zavod: realtime computation engine with guaranteed message processing capabilities ](http://www.epokmedia.fr/images/zavod_logo.png)

## A Simple to use realtime computation engine with guaranteed message processing capabilities

**ZAVOD** is inspired by the _Twitter Storm_ project originally created by _Nathan Marz_.  

## Concepts

The main purpose of ZAVOD is to help define and execute complex non-finite realtime computations.  
The main class used in ZAVOD to represent a unit of data is a **tuple**. A tuple is simply a class containing arbitrary data (of any type).  
Every computation can be seen has multiple streams of tuples.

ZAVOD require you to decompose your computation in two kinds of components :  

- Providers
- Workers

**Providers** are the source of your data.  
Every provider will emit one tuple when his `nextTuple` method is called. If a provider has nothing to emit (i.e when no new data is available) it should return directly. ZAVOD is able to guarantee the processing of the tuples emitted by your providers. This is done via the `ack` and `fail` events. When a tuple has been processed successfully through your computation the `ack` event will be emitted, and when a tuple has failed during the processing the `fail` event will be emitted on the provider which emitted the failed tuple.  

**Workers** are used to represent the flow of your computation.  
Workers will receive tuples and use the data to complete a step of your computation.  
When a worker has finished to process a tuple it need to ack it (by passing the tuple to the `ack` method).
A worker can emit from 0 to n tuple for each tuple received.  
Workers can keep some tuple in memory for further processing. One common use case is for data aggregation or join. For example you collect some tweets and keep them in memory until you receive some additional data to be attached to them.  

With providers and worker configured the next step is to design the way they are connected.  
This is done via the `link` method of the `Computation` class. You can link two components between them with keeping in mind :  

- **A provider will only emit tuple** so you can't have a provider in your output.
- You can't link a component to itself (no direct cycle)

Here is an example computation design (`p` stand for provider, `w` for worker and `c` for computation) :  

````
/*
	p1 --> w1 >
	   \ 		\
	   	\		  - > w3
	   	 \		 /
	   	  w2 -> /
          /
	p2 ->
*/

c.link('p1', 'w1');
c.link('p1', 'w2');
c.link('p2', 'w2');
c.link('w1', 'w3');
c.link('w2', 'w3');

````

### What can I do with it ?

Unlike Twitter Storm, ZAVOD is not distributed **for now**. You might be limited in terms of processing power but ZAVOD will help you in having a better organized computation flow.

ZAVOD can be used to easily compute some data from differents sources like Twitter, RSS, scraping, etc...
Example applications :  

- Filter, Enrich & analyze Twitter feeds, RSS feeds, ...
- Easily count and create trending data from multiple sources
- Process data before inserting them into a database


### Is it suitable for production use ?

The project is very experimental for now and may not be suitable to use in production.
Internally, we already use it to filter and enrich some Twitter feeds.

## Installation

    $ npm install zavod

## Example usage

Just look at the `example.js` file.

## Running Tests

To run the test suite first invoke the following command within the repo, installing the development dependencies:

    $ npm install

then run the tests (require `mocha`) :

    $ npm test


## Roadmap / Improvements

- Improved API to define providers and workers
- Better tests
- Direct emit of tuple to a desired worker
- Define schemas for tuples
- Ability to distribute provider and worker accross multiple node instance (using ZeroMQ ?)
- Ability to divide each worker into multiple tasks
- Grouping between tasks like _Twitter Storm_


## Licence

Copyright (c) 2012 Michaël Schwartz, EPOKMEDIA

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is furnished
to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.