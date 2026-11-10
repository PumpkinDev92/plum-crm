import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { ToastProvider } from './components/Toast';
import { I18nProvider } from './i18n';
import { StoreProvider } from './lib/store';
import { Contacts } from './pages/Contacts';
import { Deals } from './pages/Deals';
import { Notes } from './pages/Notes';
import { Overview } from './pages/Overview';
import { UiKit } from './pages/UiKit';

export default function App() {
  return (
    <I18nProvider>
      <ToastProvider>
      <StoreProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<AppShell />}>
              <Route index element={<Overview />} />
              <Route path="deals" element={<Deals />} />
              <Route path="contacts" element={<Contacts />} />
              <Route path="notes" element={<Notes />} />
              <Route path="ui-kit" element={<UiKit />} />
              <Route path="*" element={<Overview />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </StoreProvider>
      </ToastProvider>
    </I18nProvider>
  );
}
