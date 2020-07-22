import axios, { AxiosInstance } from 'axios'
import { TelemetryEvent } from 'common/telemetry'
import _ from 'lodash'
import ms from 'ms'

export const setupOfflineTelemetryFallback = (api: AxiosInstance, path: string) => {
  sendOfflineTelemetryPackages(api, path).catch()
  setInterval(async () => await sendOfflineTelemetryPackages(api, path).catch(), ms('1h'))
}

export const sendTelemetryEvents = async (events: TelemetryEvent[]) => {
  try {
    await axios.post(window.TELEMETRY_URL, events)
    return true
  } catch (err) {
    console.error('Could not send the telemetry packages to the storage server', err)
    return false
  }
}

const sendOfflineTelemetryPackages = async (api: AxiosInstance, path: string) => {
  try {
    const { data: events } = await api.get(`/admin/telemetry-payloads`)

    if (_.isEmpty(events)) {
      return
    }

    const status = await sendEventsToStorage(api, path, events)

    if (!status) {
      return
    }
  } catch (err) {
    console.error('Could not access the botpress server', err)

    return
  }

  await sendOfflineTelemetryPackages(api, path)
}

const sendEventsToStorage = async (api: AxiosInstance, path, events) => {
  const post = events.map(e => ({ ...e, source: 'client' }))

  const status = await sendTelemetryEvents(post)

  await api.post(`/admin/telemetry-feedback`, { events: events.map(e => e.uuid), status })

  return status
}
