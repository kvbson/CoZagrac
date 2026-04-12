import { Link } from 'react-router-dom';
import styles from './Navbar.module.css';
import { type ChangeEvent, useContext } from 'react';
import { AuthContext } from '../../../context/AuthContext';
import { useTranslation } from 'react-i18next';

export const Navbar = () => {
  const { user } = useContext(AuthContext);
  const { t, i18n } = useTranslation();

  const handleLanguageChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const selectedLanguage = event.target.value;

    if (selectedLanguage === 'pl' || selectedLanguage === 'en') {
      i18n.changeLanguage(selectedLanguage);
      localStorage.setItem('language', selectedLanguage);
    }
  };

  return (
    <nav className={styles.navbar}>
      <div className={styles.left}>
        <Link to="/">
          <div className={styles.logoIcon}>
            <img src="/logo.png" />
          </div>
        </Link>
        <Link to="/recommendations" className={styles.link}>
          {t('nav.recommendations')}
        </Link>
        <Link to="/explore" className={styles.link}>
          {t('nav.explore')}
        </Link>
        <Link to="/preferences" className={styles.link}>
          {t('nav.preferences')}
        </Link>
        {/* <a className={styles.link}>ANALYTICS</a> TODO:*/}
      </div>

      <div className={styles.right}>
        <label className={styles.languageControl}>
          <span>{t('nav.language')}:</span>
          <select value={i18n.language} onChange={handleLanguageChange} className={styles.languageSelect}>
            <option value="pl">PL</option>
            <option value="en">EN</option>
          </select>
        </label>
        <input className={styles.search} placeholder={t('nav.searchPlaceholder')} />
        {!user && <button className={styles.login}>{t('nav.login')}</button>}
      </div>
      {user && (
        <div className={styles.userIcon}>
          <img src="/user.jpg" />
        </div>
      )}
    </nav>
  );
};
