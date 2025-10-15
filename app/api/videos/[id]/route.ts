import { NextRequest, NextResponse } from 'next/server'
import { unlink } from 'fs/promises'
import { join } from 'path'
import { prisma } from '@/lib/prisma'
import { VIDEO_CONFIG } from '@/lib/video-storage'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const videoId = params.id

    const video = await prisma.video.findUnique({
      where: { id: videoId },
      include: {
        uploader: {
          select: { id: true, name: true, email: true }
        },
        _count: {
          select: { views: true }
        }
      }
    })

    if (!video) {
      return NextResponse.json(
        { ok: false, code: 'NOT_FOUND', message: 'Video not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      ok: true,
      video: {
        id: video.id,
        title: video.title,
        description: video.description,
        filename: video.filename,
        filePath: video.filePath,
        thumbnail: video.thumbnail,
        duration: video.duration,
        fileSize: video.fileSize,
        mimeType: video.mimeType,
        status: video.status,
        visibility: video.visibility,
        uploadedBy: video.uploader.name,
        viewCount: video._count.views,
        createdAt: video.createdAt.toISOString(),
      }
    })

  } catch (error) {
    console.error('Video fetch error:', error)
    return NextResponse.json(
      { ok: false, code: 'FETCH_ERROR', message: 'Failed to fetch video' },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const videoId = params.id

    // Find the video in database
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      select: { id: true, filename: true, filePath: true, thumbnail: true }
    })

    if (!video) {
      return NextResponse.json(
        { ok: false, code: 'NOT_FOUND', message: 'Video not found' },
        { status: 404 }
      )
    }

    // Delete video file from disk
    try {
      const videoFilePath = join(VIDEO_CONFIG.UPLOAD_DIR, video.filename)
      await unlink(videoFilePath)
    } catch (error) {
      console.warn('Failed to delete video file:', error)
      // Continue with database deletion even if file deletion fails
    }

    // Delete thumbnail file if it exists
    if (video.thumbnail) {
      try {
        const thumbnailPath = join(VIDEO_CONFIG.THUMBNAIL_DIR, video.thumbnail)
        await unlink(thumbnailPath)
      } catch (error) {
        console.warn('Failed to delete thumbnail file:', error)
      }
    }

    // Delete video record from database (this will cascade delete views)
    await prisma.video.delete({
      where: { id: videoId }
    })

    return NextResponse.json({
      ok: true,
      message: 'Video deleted successfully'
    })

  } catch (error) {
    console.error('Video delete error:', error)
    return NextResponse.json(
      { ok: false, code: 'DELETE_ERROR', message: 'Failed to delete video' },
      { status: 500 }
    )
  }
}