import { prepareApp } from './app/startup'
import './styles/global.css'

const app = import('./app/bootstrap')

Promise.all([prepareApp(), app])
  .then(([, { renderApp }]) => renderApp())
  .catch(async () => (await app).renderStartupError())
