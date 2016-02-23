
/**
 * Load and merge the user arguments
 * @param   {object} argv
 * @returns {object}
 */
export default function(argv) {
  const args = {};
  args.debug = process.env.NODE_ENV !== 'production';
  args.verbose = argv.verbose || false;
  //args.watch = argv.watch || false;
  return args;
}