-- SQLite
ALTER TABLE guilds RENAME COLUMN ps4Role TO psRole;
ALTER TABLE guilds RENAME COLUMN xb1Role TO xbRole;

UPDATE profiles SET platform="ps" WHERE platform="ps4";
UPDATE profiles SET platform="xb" WHERE platform="xb1";