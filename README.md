# Designing Distributed Systems - Labs #
## Labs for Designing Distributed Systems ##

The samples in this lab are written with the reader of this book in mind: https://azure.microsoft.com/en-us/resources/designing-distributed-systems/en-us/ and will guide you through the steps in designing and deploying distributed systems in Microsoft Azure.

## 1.1. Single Node Pattern: Ambassador

In this lab we'll guide you through the steps to implement the Ambassador pattern with NGINX in Kubernetes by deploying a request splitting service that will split 10% of the incoming HTTP requests to an experimental server. This request splitting service can then be used in a scenario where you want to test a new version of a back-end service with only a subset of the requests. 

![Architecture Overview of the Batch Computational Pattern](/1.%20Single%20Node%20Pattern/1.1.%20Request%20Splitter/images/AmbassadorPattern.png)

Go to lab: [1.1. Request Splitter](/1.%20Single%20Node%20Pattern/1.1.%20Request%20Splitter/README.md)

## 1.2. Single Node Pattern: Circuit Breaker Pattern

In this lab we'll guide you through the steps to implement the Ambassador pattern as a Circuit Breaker with NGINX Plus and Kubernetes. The Circuit Breaker pattern is extremely useful in scenarios where you want to help failing back-end servers to recover from failure, re-route traffic and perform rate limiting.

![Architecture Overview of the Batch Computational Pattern](/1.%20Single%20Node%20Pattern/1.2.%20Circuit%20Breaker/images/CircuitBreakerArchitecture.png)

Go to lab: [1.2. Single Node Pattern](/1.%20Single%20Node%20Pattern/1.2.%20Circuit%20Breaker/README.md)

## 2.1. Serving Pattern: Load Balancing Server

In this lab we'll guide you through the steps to deploy a replicated load balancing service that will process requests for the definition of English words. The requests will be processed by a few small replicated NodeJS servers that you will deploy in Kubernetes using a pre-existing Docker image.

![Architecture Overview of the Batch Computational Pattern](/2.%20Serving%20Patterns/2.1.%20Replicated%20Load%20Balanced%20Services/images/LoadBalancer.png)

Go to lab: [2.1. Replicated Load Balanced Services](/2.%20Serving%20Patterns/2.1.%20Replicated%20Load%20Balanced%20Services/README.md)

## 2.2. Serving Pattern: Decorator Function

In this lab you will apply the Decorator Pattern to implement a function in Kubeless that adds default values and performs transformations to the input of an HTTP RESTful API.

![Architecture Overview of the Batch Computational Pattern](/2.%20Serving%20Patterns/2.2.%20Decorator%20Function/images/DecoratorPattern.png)

Go to lab: [2.2. Decorator Function](/2.%20Serving%20Patterns/2.2.%20Decorator%20Function/README.md)

## 3. Batch Computation Pattern

In this lab you will apply the Copier, Filter, Splitter and Join patterns to implement a fully functional containerized and batch-processing thumbnail generator in Kubernetes that uses a pre-generated Docker image of the popular FFMPEG media conversion tool.

![Architecture Overview of the Batch Computational Pattern](/3.%20Batch%20Computational%20Pattern/images/BatchComputation-Containerized.png)

Go to lab: [3. Batch Computational Pattern](/3.%20Batch%20Computational%20Pattern/README.md)

## 4. Contributors ##
| Roles                                    			| Author(s)                                			|
| -------------------------------------------------	| ------------------------------------------------- |
| Project Lead / Architect / Lab Manuals		    | Manfred Wittenbols (Canviz) @mwittenbols          |
| Sponsor / Support                        			| Phil Evans (Microsoft)                            |
| Sponsor / Support                        			| Anand Chandramohan (Microsoft)                    |

## 5. Version history ##

| Version | Date          		| Comments        |
| ------- | ------------------- | --------------- |
| 1.0     | April 23, 2018 	    | Initial release |

## Disclaimer ##
**THIS CODE IS PROVIDED *AS IS* WITHOUT WARRANTY OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING ANY IMPLIED WARRANTIES OF FITNESS FOR A PARTICULAR PURPOSE, MERCHANTABILITY, OR NON-INFRINGEMENT.**

----------

![Logo of Azure AKS](/1.%20Single%20Node%20Pattern/1.1.%20Request%20Splitter/images/AzureAKS.png)
**Azure Container Service (AKS)** 
