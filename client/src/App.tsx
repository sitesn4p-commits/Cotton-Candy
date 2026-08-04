import { Navigate, Route, Routes } from 'react-router-dom'
import { useEffect } from 'react'
import { AdminCategoriesPage, AdminCollectionPage, AdminHomeContentPage, AdminMediaPage, AdminMessagesPage, AdminPage, AdminPromotionsPage, AdminRequestsPage } from './pages/AdminPage'
import { AdminLoginPage } from './pages/AdminLoginPage'
import { AboutPage, ContactPage, GalleryPage, HireCollectionPage, HomePage, OfferingDetailsPage, PromotionsPage, ServicesCollectionPage, ServicesHirePage } from './pages/PublicPages'
import { AdminLayout } from './components/AdminLayout'
import { ProtectedAdmin, SiteLayout } from './components/SiteLayout'

export default function App() {
  useEffect(() => { document.body.classList.add('loaded') }, [])
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route index element={<HomePage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="services-hire" element={<ServicesHirePage />} />
        <Route path="services" element={<ServicesCollectionPage />} />
        <Route path="services/:offeringId" element={<OfferingDetailsPage type="service" />} />
        <Route path="hire" element={<HireCollectionPage />} />
        <Route path="hire/:offeringId" element={<OfferingDetailsPage type="hire" />} />
        <Route path="promotions" element={<PromotionsPage />} />
        <Route path="gallery" element={<Navigate to="/gallery/images" replace />} />
        <Route path="gallery/images" element={<GalleryPage kind="image" />} />
        <Route path="gallery/videos" element={<GalleryPage kind="video" />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="store" element={<Navigate to="/hire" replace />} />
        <Route path="store/:offeringId" element={<Navigate to="/hire" replace />} />
      </Route>
      <Route path="manage-cotton-candy/sign-in" element={<AdminLoginPage />} />
      <Route path="manage-cotton-candy" element={<ProtectedAdmin><AdminLayout /></ProtectedAdmin>}>
        <Route index element={<AdminPage />} />
        <Route path="services" element={<AdminCollectionPage type="service" />} />
        <Route path="hire" element={<AdminCollectionPage type="hire" />} />
        <Route path="categories" element={<AdminCategoriesPage />} />
        <Route path="requests" element={<AdminRequestsPage />} />
        <Route path="messages" element={<AdminMessagesPage />} />
        <Route path="gallery/images" element={<AdminMediaPage kind="image" />} />
        <Route path="gallery/videos" element={<AdminMediaPage kind="video" />} />
        <Route path="promotions" element={<AdminPromotionsPage />} />
        <Route path="home-content" element={<AdminHomeContentPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
