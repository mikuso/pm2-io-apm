import debug from 'debug'
debug('axm:profiling')
import ProfilingType from './profilingType'
import FileUtils from '../utils/file'
import utils from '../utils/module'

export default class ProfilingHeapFallback implements ProfilingType {

  private profiler
  private snapshot
  private MODULE_NAME = 'v8-profiler-node8'
  private FALLBACK_MODULE_NAME = 'v8-profiler'

  async init () {
    let path
    let moduleName = this.MODULE_NAME

    try {
      path = await utils.getModulePath(this.MODULE_NAME)
    } catch (e) {
      try {
        moduleName = this.FALLBACK_MODULE_NAME
        path = await utils.getModulePath(this.FALLBACK_MODULE_NAME)
      } catch (err) {
        throw new Error('Profiler not loaded !')
      }
    }

    this.profiler = utils.loadModule(path, moduleName)
  }

  destroy () {
    debug('Profiler destroyed !')
  }

  start () {
    this.snapshot = this.profiler.takeSnapshot('km-heap-snapshot')
  }

  async stop () {
    return await this.getProfileInfo()
  }

  async takeSnapshot () {
    this.start()
    return await this.stop()
  }

  private getProfileInfo () {
    return new Promise(resolve => {
      let buffer = ''
      this.snapshot.serialize(
        (data, length) => {
          buffer += data
        },
        () => {
          this.snapshot.delete()

          resolve(buffer)
        }
      )
    }).then((buffer) => {
      return FileUtils.writeDumpFile(buffer, '.heapprofile')
    })
  }
}