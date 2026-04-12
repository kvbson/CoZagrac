import { Link } from 'react-router-dom';
import styles from './Navbar.module.css';
import { useContext } from 'react';
import { AuthContext } from '../../../context/AuthContext';

export const Navbar = () => {
  const { user } = useContext(AuthContext);

  return (
    <nav className={styles.navbar}>
      <div className={styles.left}>
        <Link to="/">
          <div className={styles.logoIcon}>
            <img src="/logo.png" />
          </div>
        </Link>
        <Link to="/recommendations" className={styles.link}>
          RECOMMENDATIONS
        </Link>
        <Link to="/explore" className={styles.link}>
          EXPLORE
        </Link>
        <Link to="/preferences" className={styles.link}>
          PREFERENCES
        </Link>
        {/* <a className={styles.link}>ANALYTICS</a> TODO:*/}
      </div>

      <div className={styles.right}>
        <input className={styles.search} placeholder="find..." />
        {!user && <button className={styles.login}>LOGIN</button>}
      </div>
      {user && (
        <div className={styles.userIcon}>
          <img src="/user.jpg" />
        </div>
      )}
    </nav>
  );
};
