import { Link } from 'react-router-dom';
import styles from './navbar.module.css';
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
        <Link to="/recommendations">
          <a className={styles.link}>RECOMMENDATIONS</a>
        </Link>
        <Link to="/explore">
          <a className={styles.link}>EXPLORE</a>
        </Link>
        <Link to="/preferences">
          <a className={styles.link}>PREFERENCES</a>
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
