'use client'
import { zodResolver } from '@hookform/resolvers/zod'
import { Calendar, Check, StarIcon, User } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { SubmitHandler, useForm } from 'react-hook-form'
import { useInView } from 'react-intersection-observer'
import { z } from 'zod'
import { toast } from 'sonner'

import Rating from '@/components/shared/product/rating'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  createUpdateReview,
  getReviewByProductId,
  getReviews,
} from '@/lib/actions/review.actions'
import { ReviewInputSchema } from '@/lib/validator'
import RatingSummary from '@/components/shared/product/rating-summary'
import { IProduct } from '@/lib/db/models/product.model'
import { Separator } from '@/components/ui/separator'
import { IReviewDetails } from '@/types'

const reviewFormDefaultValues = {
  title: '',
  comment: '',
  rating: 0,
}

export default function ReviewList({
  userId,
  product,
}: {
  userId: string | undefined
  product: IProduct
}) {
  const [page, setPage] = useState(2)
  const [totalPages, setTotalPages] = useState(0)
  const [reviews, setReviews] = useState<IReviewDetails[]>([])
  const { ref, inView } = useInView({ triggerOnce: true })

  const reload = async () => {
    try {
      const res = await getReviews({ productId: product._id, page: 1 })
      setReviews([...res.data])
      setTotalPages(res.totalPages)
    } catch (err) {
      console.error('Error fetching reviews:', err)
      toast.error('Error in fetching reviews')
    }
  }

  const loadMoreReviews = async () => {
    if (totalPages !== 0 && page > totalPages) return
    setLoadingReviews(true)
    try {
      const res = await getReviews({ productId: product._id, page })
      setReviews([...reviews, ...res.data])
      setTotalPages(res.totalPages)
      setPage(page + 1)
    } catch (err) {
      console.error('Error loading more reviews:', err)
      toast.error('Failed to load more reviews')
    } finally {
      setLoadingReviews(false)
    }
  }

  const [loadingReviews, setLoadingReviews] = useState(false)

  useEffect(() => {
    const loadReviews = async () => {
      setLoadingReviews(true)
      try {
        const res = await getReviews({ productId: product._id, page: 1 })
        setReviews([...res.data])
        setTotalPages(res.totalPages)
      } catch (err) {
        console.error('Initial reviews load error:', err)
        toast.error('Failed to load initial reviews')
      } finally {
        setLoadingReviews(false)
      }
    }

    if (inView) loadReviews()
  }, [inView, product._id])

  type CustomerReview = z.infer<typeof ReviewInputSchema>
  const form = useForm<CustomerReview>({
    resolver: zodResolver(ReviewInputSchema),
    defaultValues: reviewFormDefaultValues,
  })

  const [open, setOpen] = useState(false)

  const onSubmit: SubmitHandler<CustomerReview> = async (values) => {
    try {
      const res = await createUpdateReview({
        data: { ...values, product: product._id },
        path: `/product/${product.slug}`,
      })
      if (!res.success) throw new Error(res.message)

      setOpen(false)
      await reload()
      toast.success(res.message)
    } catch (err) {
      console.error('Review submission error:', err)
      toast.error(
        err instanceof Error ? err.message : 'Review submission failed'
      )
    }
  }

  const handleOpenForm = async () => {
    form.setValue('product', product._id)
    form.setValue('user', userId!)
    form.setValue('isVerifiedPurchase', true)

    try {
      const review = await getReviewByProductId({ productId: product._id })
      if (review) {
        form.setValue('title', review.title)
        form.setValue('comment', review.comment)
        form.setValue('rating', review.rating)
      }
    } catch (err) {
      console.error('Error fetching existing review:', err)
      toast.error('Failed to load existing review')
    }
    setOpen(true)
  }

  return (
    <div className='space-y-2'>
      {reviews.length === 0 && !loadingReviews && <div>No reviews yet</div>}

      <div className='grid grid-cols-1 md:grid-cols-4 gap-8'>
        <div className='flex flex-col gap-2'>
          {reviews.length > 0 && (
            <RatingSummary
              avgRating={product.avgRating}
              numReviews={product.numReviews}
              ratingDistribution={product.ratingDistribution}
            />
          )}
          <Separator className='my-3' />
          <div className='space-y-3'>
            <h3 className='font-bold text-lg lg:text-xl'>
              Review this product
            </h3>
            <p className='text-sm'>Share your thoughts with other customers</p>
            {userId ? (
              <Dialog open={open} onOpenChange={setOpen}>
                <Button
                  onClick={handleOpenForm}
                  variant='outline'
                  className='rounded-full w-full'
                >
                  Write a customer review
                </Button>

                <DialogContent className='sm:max-w-[425px]'>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)}>
                      <DialogHeader>
                        <DialogTitle>Write a customer review</DialogTitle>
                        <DialogDescription>
                          Share your thoughts with other customers
                        </DialogDescription>
                      </DialogHeader>
                      <div className='grid gap-4 py-4'>
                        <div className='flex flex-col gap-5'>
                          <FormField
                            control={form.control}
                            name='title'
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Title</FormLabel>
                                <FormControl>
                                  <Input placeholder='Enter title' {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name='comment'
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Comment</FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder='Enter comment'
                                    {...field}
                                    className='min-h-[100px]'
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField
                          control={form.control}
                          name='rating'
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Rating</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                value={field.value.toString()}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder='Select a rating' />
                                </SelectTrigger>
                                <SelectContent>
                                  {[1, 2, 3, 4, 5].map((value) => (
                                    <SelectItem
                                      key={value}
                                      value={value.toString()}
                                    >
                                      <div className='flex items-center gap-1'>
                                        {value} <StarIcon className='h-4 w-4' />
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <DialogFooter>
                        <Button
                          type='submit'
                          size='lg'
                          disabled={form.formState.isSubmitting}
                        >
                          {form.formState.isSubmitting
                            ? 'Submitting...'
                            : 'Submit'}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            ) : (
              <div>
                Please{' '}
                <Link
                  href={`/sign-in?callbackUrl=/product/${product.slug}`}
                  className='highlight-link'
                >
                  sign in
                </Link>{' '}
                to write a review
              </div>
            )}
          </div>
        </div>
        <div className='md:col-span-3 flex flex-col gap-3'>
          {reviews.map((review) => (
            <Card key={review._id}>
              <CardHeader>
                <div className='flex justify-between items-start'>
                  <CardTitle>{review.title}</CardTitle>
                  {review.isVerifiedPurchase && (
                    <div className='italic text-sm flex items-center gap-1'>
                      <Check className='h-4 w-4 text-green-600' />
                      Verified Purchase
                    </div>
                  )}
                </div>
                <CardDescription className='pt-2'>
                  {review.comment}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className='flex flex-wrap gap-4 items-center text-sm text-muted-foreground'>
                  <Rating rating={review.rating} />
                  <div className='flex items-center'>
                    <User className='mr-1 h-4 w-4' />
                    {review.user?.name || 'Anonymous User'}
                  </div>
                  <div className='flex items-center'>
                    <Calendar className='mr-1 h-4 w-4' />
                    {new Date(review.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          <div ref={ref} className='text-center'>
            {page <= totalPages && (
              <Button
                variant='link'
                onClick={loadMoreReviews}
                disabled={loadingReviews}
              >
                {loadingReviews ? 'Loading...' : 'See more reviews'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
