import { Kafka, logLevel, Partitioners } from 'kafkajs'

// No broker address from environment or user input: this harness stays on loopback.
export const brokerAddress = '127.0.0.1:19092'
export function localKafka(clientId = 'editorial-kafka-lab') {
  return new Kafka({ clientId, brokers: [brokerAddress], logLevel: logLevel.NOTHING,
    connectionTimeout: 3000, requestTimeout: 10000, retry: { retries: 3 } })
}
export function localProducer() {
  return localKafka().producer({ allowAutoTopicCreation: false,
    createPartitioner: Partitioners.DefaultPartitioner, maxInFlightRequests: 1 })
}
