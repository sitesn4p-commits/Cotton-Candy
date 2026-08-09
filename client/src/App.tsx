import { Navigate, Route, Routes } from 'react-router-dom'
import { AdminCategoriesPage, AdminCollectionPage, AdminGalleryImagesPage, AdminHomeContentPage, AdminMediaPage, AdminMessagesPage, AdminNewsletterSubscribersPage, AdminOrderHistoryPage, AdminPage, AdminPageArtworkPage, AdminPromotionsPage, AdminRequestsPage } from './pages/AdminPage'
import { AdminLoginPage } from './pages/AdminLoginPage'
import { ContactPage, GalleryImagesPage, GalleryPage, HireCollectionPage, HomePage, OfferingDetailsPage, PromotionsPage, ServicesCollectionPage, ServicesHirePage, UpdatedAboutPage } from './pages/PublicPages'
import { AdminLayout } from './components/AdminLayout'
import { ProtectedAdmin, SiteLayout } from './components/SiteLayout'

export default function App() {
  const isAdminBuild = import.meta.env.VITE_APP_MODE === 'admin'
  const adminRoutes = (
    <>
      <Route path="manage-cotton-candy/sign-in" element={<AdminLoginPage />} />
      <Route path="manage-cotton-candy" element={<ProtectedAdmin><AdminLayout /></ProtectedAdmin>}>
        <Route index element={<AdminPage />} />
        <Route path="services" element={<AdminCollectionPage type="service" />} />
        <Route path="hire" element={<AdminCollectionPage type="hire" />} />
        <Route path="categories" element={<AdminCategoriesPage />} />
        <Route path="requests" element={<AdminRequestsPage />} />
        <Route path="order-history" element={<AdminOrderHistoryPage />} />
        <Route path="messages" element={<AdminMessagesPage />} />
        <Route path="newsletter-subscribers" element={<AdminNewsletterSubscribersPage />} />
        <Route path="gallery/images" element={<AdminGalleryImagesPage />} />
        <Route path="gallery/videos" element={<AdminMediaPage kind="video" />} />
        <Route path="promotions" element={<AdminPromotionsPage />} />
        <Route path="home-content" element={<AdminHomeContentPage />} />
        <Route path="page-artwork" element={<AdminPageArtworkPage />} />
      </Route>
    </>
  )

  return (
    <Routes>
      {!isAdminBuild && (
        <Route element={<SiteLayout />}>
          <Route index element={<HomePage />} />
          <Route path="about" element={<UpdatedAboutPage />} />
          <Route path="services-hire" element={<ServicesHirePage />} />
          <Route path="services" element={<ServicesCollectionPage />} />
          <Route path="services/:offeringId" element={<OfferingDetailsPage type="service" />} />
          <Route path="hire" element={<HireCollectionPage />} />
          <Route path="hire/:offeringId" element={<OfferingDetailsPage type="hire" />} />
          <Route path="promotions" element={<PromotionsPage />} />
          <Route path="gallery" element={<Navigate to="/gallery/images" replace />} />
          <Route path="gallery/images" element={<GalleryImagesPage />} />
          <Route path="gallery/videos" element={<GalleryPage kind="video" />} />
          <Route path="contact" element={<ContactPage />} />
          <Route path="store" element={<Navigate to="/hire" replace />} />
          <Route path="store/:offeringId" element={<Navigate to="/hire" replace />} />
        </Route>
      )}
      {adminRoutes}
      <Route path="*" element={<Navigate to={isAdminBuild ? '/manage-cotton-candy' : '/'} replace />} />
    </Routes>
  )
}
