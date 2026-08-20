import { applySharedSnapshot, publishSharedContent } from './adminStore'
import { onSharedSnapshot, startCloudSyncPolling } from './cloudSync'

/** Boot shared sync so admin edits appear on every device using this app host. */
export function bootstrapCloudSync() {
  onSharedSnapshot((snapshot) => {
    applySharedSnapshot(snapshot)
  })
  startCloudSyncPolling({
    onEmptyRemote: async () => {
      // Seed the shared store from this device so other devices can catch up.
      await publishSharedContent()
    },
  })
}
