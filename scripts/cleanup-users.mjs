import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Users to keep
const KEEP_EMAILS = [
  'coen@stewartandco.org',
  'malakye@easyflow.au'
]

async function cleanupUsers() {
  console.log('🧹 Starting user cleanup...')
  console.log(`📌 Keeping users: ${KEEP_EMAILS.join(', ')}`)

  try {
    // Get all users
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true
      }
    })

    console.log(`\n📊 Found ${allUsers.length} total users`)

    // Find users to delete
    const usersToDelete = allUsers.filter(user => !KEEP_EMAILS.includes(user.email))
    const usersToKeep = allUsers.filter(user => KEEP_EMAILS.includes(user.email))

    console.log(`✅ Keeping ${usersToKeep.length} users:`)
    usersToKeep.forEach(user => {
      console.log(`   - ${user.email} (${user.name || 'No name'}) - ${user.role}`)
    })

    console.log(`\n🗑️  Deleting ${usersToDelete.length} users:`)
    usersToDelete.forEach(user => {
      console.log(`   - ${user.email} (${user.name || 'No name'}) - ${user.role}`)
    })

    if (usersToDelete.length === 0) {
      console.log('\n✨ No users to delete. Database is already clean!')
      return
    }

    // Confirm deletion
    console.log('\n⚠️  This will permanently delete the above users and all their associated data.')
    console.log('   Related records (messages, enrollments, etc.) will be automatically deleted due to cascade rules.')
    
    // Delete users (cascade will handle related records)
    let deletedCount = 0
    for (const user of usersToDelete) {
      try {
        await prisma.user.delete({
          where: { id: user.id }
        })
        deletedCount++
        console.log(`   ✓ Deleted ${user.email}`)
      } catch (error) {
        console.error(`   ✗ Failed to delete ${user.email}:`, error.message)
      }
    }

    console.log(`\n✅ Cleanup complete! Deleted ${deletedCount} of ${usersToDelete.length} users.`)
    console.log(`📊 Remaining users: ${usersToKeep.length}`)

  } catch (error) {
    console.error('❌ Error during cleanup:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

cleanupUsers()
  .then(() => {
    console.log('\n✨ Cleanup script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Cleanup script failed:', error)
    process.exit(1)
  })

